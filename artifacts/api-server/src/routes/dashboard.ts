import { Router, type IRouter } from "express";
import {
  GetDashboardResponse,
  ListAuditRecordsQueryParams,
  ListAuditRecordsResponse,
} from "@workspace/api-zod";
import { userIdFrom } from "../middlewares/auth";
import { auditResponse } from "../lib/audit";
import { AuditModel, ScanModel } from "../lib/models";
import { getScanDraft } from "../lib/scan-drafts";
import { scanSummary } from "../lib/scan-serializers";

const router: IRouter = Router();

router.get("/dashboard", async (_req, res): Promise<void> => {
  const ownerId = userIdFrom(res);
  const scans = await ScanModel.find({ ownerId }).sort({ createdAt: -1 }).lean();
  for (const scan of scans) {
    if (
      scan.status === "pending_review" &&
      !getScanDraft(scan._id.toString(), ownerId)
    ) {
      await ScanModel.updateOne(
        { _id: scan._id, ownerId, status: "pending_review" },
        { $set: { status: "expired" } },
      );
      scan.status = "expired";
    }
  }
  const summary = {
    totalScans: scans.length,
    completedScans: scans.filter((scan) => scan.status === "completed").length,
    pendingReviews: scans.filter((scan) => scan.status === "pending_review").length,
    totalFindings: scans.reduce((total, scan) => total + scan.findingsCount, 0),
    riskCounts: {
      low: scans.filter((scan) => scan.riskLevel === "low").length,
      medium: scans.filter((scan) => scan.riskLevel === "medium").length,
      high: scans.filter((scan) => scan.riskLevel === "high").length,
    },
    recentScans: scans.slice(0, 5).map((scan) => scanSummary(scan)),
  };
  res.json(GetDashboardResponse.parse(summary));
});

router.get("/audit", async (req, res): Promise<void> => {
  const query = ListAuditRecordsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Invalid audit limit." });
    return;
  }

  const records = await AuditModel.find({ ownerId: userIdFrom(res) })
    .sort({ createdAt: -1 })
    .limit(query.data.limit ?? 50)
    .lean();
  res.json(ListAuditRecordsResponse.parse(records.map(auditResponse)));
});

export default router;
