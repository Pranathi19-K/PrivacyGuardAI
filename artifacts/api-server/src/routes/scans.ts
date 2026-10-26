import path from "node:path";
import { Router, type IRouter } from "express";
import multer from "multer";
import { rateLimit } from "express-rate-limit";
import { ai } from "@workspace/integrations-gemini-ai";
import {
  AskPrivacyAssistantBody,
  AskPrivacyAssistantParams,
  AskPrivacyAssistantResponse,
  CreateScanBody,
  CreateScanResponse,
  DeleteScanParams,
  DeleteScanResponse,
  DownloadMaskedDocumentParams,
  DownloadPrivacyReportParams,
  DownloadPrivacyReportResponse,
  FinalizeScanBody,
  FinalizeScanParams,
  FinalizeScanResponse,
  GetScanParams,
  GetScanResponse,
  ListSampleDocumentsResponse,
  ListScansResponse,
} from "@workspace/api-zod";
import { userIdFrom } from "../middlewares/auth";
import { recordAudit } from "../lib/audit";
import { buildPrivacyAssistantPrompt } from "../lib/assistant-prompt";
import { extractDocumentText, MAX_UPLOAD_BYTES } from "../lib/document-processing";
import { AuditModel, DetectionRuleModel, ScanModel } from "../lib/models";
import { buildPrivacyReport } from "../lib/scan-report";
import { getScanDraft, saveScanDraft, deleteScanDraft } from "../lib/scan-drafts";
import {
  calculateRisk,
  detectSensitiveData,
  maskedTextForFindings,
  summarizeFindings,
  type Finding,
  type MaskStyle,
  type RuleInput,
} from "../lib/scan-engine";
import { scanDetail, scanSummary } from "../lib/scan-serializers";

const router: IRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 2, parts: 3 },
});
const assistantLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Assistant limit reached. Wait a minute before asking again." },
});

const sampleDocuments = [
  {
    id: "support-intake",
    title: "Support intake",
    description: "A short synthetic customer support note with an email and phone number.",
    filename: "support-intake.txt",
    format: "txt" as const,
    content:
      "Support intake — fictional sample\nName: Alex Morgan\nEmail: alex.morgan@example.test\nPhone: +1 415-555-0134\nIssue: The sample account needs a password reset.",
  },
  {
    id: "vendor-record",
    title: "Vendor onboarding",
    description: "A synthetic onboarding record with example identification patterns.",
    filename: "vendor-onboarding.txt",
    format: "txt" as const,
    content:
      "Vendor onboarding — fictional sample\nCustomer: Priya Nair\nEmail: priya.nair@example.test\nPAN: ABCDE1234F\nReference: 4111 1111 1111 1111\nNote: All names and values in this example are synthetic.",
  },
];

function toRuleInput(rule: {
  _id: { toString(): string };
  label: string;
  pattern: string;
  maskWith: string;
}): RuleInput {
  return {
    id: rule._id.toString(),
    label: rule.label,
    pattern: rule.pattern,
    maskWith: rule.maskWith,
  };
}

function safeDisplayFilename(filename: string): string {
  const base = path.basename(filename).replace(/[\u0000-\u001f\u007f]/g, "");
  const cleaned = base.replace(/[^\p{L}\p{N}._ -]/gu, "_").trim();
  return (cleaned || "document.txt").slice(0, 180);
}

async function markExpiredIfDraftMissing(
  scan: {
    _id: { toString(): string };
    ownerId: string;
    status: string;
  },
  ownerId: string,
): Promise<void> {
  if (scan.status === "pending_review" && !getScanDraft(scan._id.toString(), ownerId)) {
    await ScanModel.updateOne(
      { _id: scan._id, ownerId, status: "pending_review" },
      { $set: { status: "expired" } },
    );
  }
}

router.get("/samples", (_req, res): void => {
  res.json(ListSampleDocumentsResponse.parse(sampleDocuments));
});

router.get("/scans", async (_req, res): Promise<void> => {
  const ownerId = userIdFrom(res);
  const scans = await ScanModel.find({ ownerId }).sort({ createdAt: -1 }).lean();
  const response = [];
  for (const scan of scans) {
    await markExpiredIfDraftMissing(scan, ownerId);
    response.push(
      scanSummary({
        ...scan,
        status:
          scan.status === "pending_review" &&
          !getScanDraft(scan._id.toString(), ownerId)
            ? "expired"
            : scan.status,
      } as Parameters<typeof scanSummary>[0]),
    );
  }
  res.json(ListScansResponse.parse(response));
});

router.post("/scans", upload.single("file"), async (req, res): Promise<void> => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "Choose a PDF or TXT file to scan." });
    return;
  }

  const rawDetectNames: unknown = req.body?.detectNames;
  if (
    rawDetectNames !== undefined &&
    rawDetectNames !== "true" &&
    rawDetectNames !== "false" &&
    rawDetectNames !== true &&
    rawDetectNames !== false
  ) {
    res.status(400).json({ error: "Name detection must be enabled or disabled." });
    return;
  }
  const detectNames = rawDetectNames === true || rawDetectNames === "true";
  const bodyValidation = CreateScanBody.safeParse({
    file: new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }),
    detectNames,
  });
  if (!bodyValidation.success) {
    res.status(400).json({ error: "The uploaded document could not be validated." });
    return;
  }

  let extracted: Awaited<ReturnType<typeof extractDocumentText>>;
  try {
    extracted = await extractDocumentText(file);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "The document could not be read.",
    });
    return;
  }

  const ownerId = userIdFrom(res);
  const storedRules = await DetectionRuleModel.find({ ownerId, enabled: true }).lean();
  const rules = storedRules.map(toRuleInput);
  const findings = detectSensitiveData(extracted.text, { detectNames, rules });
  const risk = calculateRisk(findings);
  const filename = safeDisplayFilename(file.originalname);
  const scan = await ScanModel.create({
    ownerId,
    filename,
    format: extracted.format,
    status: "pending_review",
    findingsCount: findings.length,
    riskScore: risk.score,
    riskLevel: risk.level,
    riskExplanation: risk.explanation,
    findingCounts: summarizeFindings(findings),
    selectedCount: 0,
    maskedText: "",
    maskedAt: null,
  });

  saveScanDraft({
    scanId: scan._id.toString(),
    ownerId,
    filename,
    format: extracted.format,
    originalText: extracted.text,
    findings,
    rules,
    createdAt: scan.createdAt,
  });
  await recordAudit(
    ownerId,
    "scan_created",
    `Scanned a ${extracted.format.toUpperCase()} document; ${findings.length} possible finding${findings.length === 1 ? "" : "s"} need review.`,
    scan._id.toString(),
  );

  const maskedPreview = maskedTextForFindings(
    extracted.text,
    findings,
    new Set(findings.map((finding) => finding.id)),
    "category",
  );
  res.status(201).json(
    CreateScanResponse.parse({
      id: scan._id.toString(),
      filename,
      format: extracted.format,
      createdAt: scan.createdAt.toISOString(),
      originalText: extracted.text,
      maskedText: maskedPreview,
      findings,
      riskScore: risk.score,
      riskLevel: risk.level,
      riskExplanation: risk.explanation,
    }),
  );
});

router.get("/scans/:scanId", async (req, res): Promise<void> => {
  const params = GetScanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid scan identifier." });
    return;
  }
  const ownerId = userIdFrom(res);
  const scan = await ScanModel.findOne({ _id: params.data.scanId, ownerId }).lean();
  if (!scan) {
    res.status(404).json({ error: "Scan not found." });
    return;
  }
  await markExpiredIfDraftMissing(scan, ownerId);
  const updated =
    scan.status === "pending_review" &&
    !getScanDraft(scan._id.toString(), ownerId)
      ? { ...scan, status: "expired" }
      : scan;
  res.json(GetScanResponse.parse(scanDetail(updated as Parameters<typeof scanDetail>[0])));
});

router.post("/scans/:scanId/finalize", async (req, res): Promise<void> => {
  const params = FinalizeScanParams.safeParse(req.params);
  const body = FinalizeScanBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Review selections or masking style are invalid." });
    return;
  }

  const ownerId = userIdFrom(res);
  const scan = await ScanModel.findOne({ _id: params.data.scanId, ownerId });
  if (!scan) {
    res.status(404).json({ error: "Scan not found." });
    return;
  }
  if (scan.status === "completed") {
    res.json(FinalizeScanResponse.parse(scanDetail(scan as Parameters<typeof scanDetail>[0])));
    return;
  }

  const draft = getScanDraft(scan._id.toString(), ownerId);
  if (!draft) {
    await ScanModel.updateOne(
      { _id: scan._id, ownerId },
      { $set: { status: "expired" } },
    );
    res.status(410).json({ error: "The private review session expired. Upload the document again to continue." });
    return;
  }

  const selectedIds = new Set(body.data.selectedFindingIds);
  const knownIds = new Set(draft.findings.map((finding) => finding.id));
  if (
    selectedIds.size !== body.data.selectedFindingIds.length ||
    [...selectedIds].some((id) => !knownIds.has(id))
  ) {
    res.status(400).json({ error: "Some selected findings are no longer available." });
    return;
  }
  if (draft.findings.length > 0 && selectedIds.size === 0) {
    res.status(400).json({ error: "Select at least one finding before saving a masked copy." });
    return;
  }

  const maskStyle = body.data.maskStyle as MaskStyle;
  const maskedText =
    draft.findings.length === 0
      ? ""
      : maskedTextForFindings(
          draft.originalText,
          draft.findings,
          selectedIds,
          maskStyle,
        );
  if (maskedText.length > 1_000_000) {
    res.status(400).json({ error: "The masked document is too large to save." });
    return;
  }

  scan.status = "completed";
  scan.selectedCount = selectedIds.size;
  scan.maskedText = maskedText;
  scan.maskedAt = new Date();
  await scan.save();
  deleteScanDraft(scan._id.toString());
  await recordAudit(
    ownerId,
    "scan_finalized",
    `Saved a masked copy after selecting ${selectedIds.size} finding${selectedIds.size === 1 ? "" : "s"}.`,
    scan._id.toString(),
  );
  res.json(
    FinalizeScanResponse.parse(scanDetail(scan as Parameters<typeof scanDetail>[0])),
  );
});

router.get("/scans/:scanId/download", async (req, res): Promise<void> => {
  const params = DownloadMaskedDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid scan identifier." });
    return;
  }
  const scan = await ScanModel.findOne({
    _id: params.data.scanId,
    ownerId: userIdFrom(res),
    status: "completed",
  }).select("maskedText");
  if (!scan || !scan.maskedText) {
    res.status(404).json({ error: "No masked document is available for download." });
    return;
  }
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="privacyguard-masked.txt"');
  res.send(scan.maskedText);
});

router.get("/scans/:scanId/report", async (req, res): Promise<void> => {
  const params = DownloadPrivacyReportParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid scan identifier." });
    return;
  }
  const scan = await ScanModel.findOne({
    _id: params.data.scanId,
    ownerId: userIdFrom(res),
  }).lean();
  if (!scan) {
    res.status(404).json({ error: "Scan not found." });
    return;
  }

  const report = buildPrivacyReport({
    scanId: scan._id.toString(),
    createdAt: scan.createdAt,
    format: scan.format,
    status: scan.status,
    riskScore: scan.riskScore,
    riskLevel: scan.riskLevel,
    findingsCount: scan.findingsCount,
    selectedCount: scan.selectedCount,
    riskExplanation: scan.riskExplanation,
    findingCounts: scan.findingCounts,
  });

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="privacyguard-analysis.txt"');
  res.send(DownloadPrivacyReportResponse.parse(report));
});

router.delete("/scans/:scanId", async (req, res): Promise<void> => {
  const params = DeleteScanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid scan identifier." });
    return;
  }
  const ownerId = userIdFrom(res);
  const deleted = await ScanModel.findOneAndDelete({
    _id: params.data.scanId,
    ownerId,
  });
  if (!deleted) {
    res.status(404).json({ error: "Scan not found." });
    return;
  }
  deleteScanDraft(deleted._id.toString());
  await recordAudit(ownerId, "scan_deleted", "Deleted a scan and its saved masked document.", deleted._id.toString());
  res.status(204).json(DeleteScanResponse.parse(undefined));
});

router.post(
  "/scans/:scanId/assistant",
  assistantLimiter,
  async (req, res): Promise<void> => {
    const params = AskPrivacyAssistantParams.safeParse(req.params);
    const body = AskPrivacyAssistantBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Enter a question about this scan." });
      return;
    }

    const ownerId = userIdFrom(res);
    const scan = await ScanModel.findOne({
      _id: params.data.scanId,
      ownerId,
    }).lean();
    if (!scan) {
      res.status(404).json({ error: "Scan not found." });
      return;
    }

    const draft = scan.status === "pending_review"
      ? getScanDraft(scan._id.toString(), ownerId)
      : null;
    if (scan.status === "pending_review" && !draft) {
      res.status(410).json({ error: "The private review session expired. Upload the document again to continue." });
      return;
    }

    const questionRules = await DetectionRuleModel.find({ ownerId, enabled: true }).lean();
    const findingCounts = draft
      ? summarizeFindings(draft.findings)
      : scan.findingCounts.map((item: { type: string; label: string; count: number }) => ({
          type: item.type,
          label: item.label,
          count: item.count,
        }));
    const metadata = {
      riskLevel: scan.riskLevel,
      riskScore: scan.riskScore,
      findingCounts,
    };
    const assistantPrompt = buildPrivacyAssistantPrompt(
      body.data.question,
      metadata,
      questionRules.map(toRuleInput),
    );

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: [
          {
            role: "user",
            parts: [{ text: assistantPrompt }],
          },
        ],
        config: { maxOutputTokens: 8192, temperature: 0.35 },
      });
      const answer = response.text?.trim();
      if (!answer) {
        res.status(503).json({ error: "The Privacy Assistant did not return an answer. Try again shortly." });
        return;
      }
      await recordAudit(ownerId, "assistant_question", "Asked the Privacy Assistant about scan findings.", scan._id.toString());
      res.json(
        AskPrivacyAssistantResponse.parse({
          answer,
          privacyNote: "Only a sanitized question and scan metadata were sent to Gemini. Document text is never sent.",
        }),
      );
    } catch (error) {
      req.log.warn(
        { errorName: error instanceof Error ? error.name : "UnknownError" },
        "Privacy assistant request failed",
      );
      res.status(503).json({ error: "The Privacy Assistant is temporarily unavailable. Try again shortly." });
    }
  },
);

export default router;
