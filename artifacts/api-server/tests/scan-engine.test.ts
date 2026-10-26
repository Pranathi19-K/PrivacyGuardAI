import assert from "node:assert/strict";
import test from "node:test";
import { buildPrivacyAssistantPrompt } from "../src/lib/assistant-prompt";
import { buildPrivacyReport } from "../src/lib/scan-report";
import {
  calculateRisk,
  detectSensitiveData,
  maskedTextForFindings,
  validateSafePattern,
} from "../src/lib/scan-engine";

test("detects common sensitive values and optional labeled names", () => {
  const text =
    "Name: Alex Morgan\nEmail: alex@example.test\nPhone: +1 415-555-0134\nPAN: ABCDE1234F\nCard: 4111 1111 1111 1111";
  const findings = detectSensitiveData(text, { detectNames: true });
  const types = findings.map((finding) => finding.type);

  assert.ok(types.includes("name"));
  assert.ok(types.includes("email"));
  assert.ok(types.includes("phone"));
  assert.ok(types.includes("id_number"));
  assert.ok(types.includes("credit_card"));
  assert.equal(findings.find((finding) => finding.type === "name")?.value, "Alex Morgan");
  assert.equal(findings.find((finding) => finding.type === "email")?.value, "alex@example.test");
});

test("name detection is opt-in", () => {
  const findings = detectSensitiveData("Name: Alex Morgan");
  assert.equal(findings.length, 0);
});

test("masking replaces selected values in the returned text", () => {
  const original = "Reach Alex at alex@example.test.";
  const findings = detectSensitiveData(original);
  const email = findings.find((finding) => finding.type === "email");
  assert.ok(email);

  const masked = maskedTextForFindings(
    original,
    findings,
    new Set([email.id]),
    "category",
  );
  assert.equal(masked, "Reach Alex at [EMAIL ADDRESS REDACTED].");
  assert.equal(masked.includes(email.value), false);
});

test("unselected findings remain unchanged while selected content is redacted", () => {
  const original = "alex@example.test and +1 415-555-0134";
  const findings = detectSensitiveData(original);
  const email = findings.find((finding) => finding.type === "email");
  assert.ok(email);
  const masked = maskedTextForFindings(
    original,
    findings,
    new Set([email.id]),
    "redact",
  );

  assert.ok(masked.includes("[REDACTED]"));
  assert.ok(masked.includes("+1 415-555-0134"));
  assert.equal(masked.includes("alex@example.test"), false);
});

test("custom rules are matched and their replacement is used in category mode", () => {
  const findings = detectSensitiveData("Ticket: QRS1234", {
    rules: [
      {
        id: "rule-one",
        label: "Ticket code",
        pattern: "\\b[A-Z]{3}\\d{4}\\b",
        maskWith: "[TICKET CODE]",
      },
    ],
  });
  const custom = findings.find((finding) => finding.type === "custom");
  assert.ok(custom);
  assert.equal(custom.value, "QRS1234");
  assert.equal(
    maskedTextForFindings("Ticket: QRS1234", findings, new Set([custom.id]), "category"),
    "Ticket: [TICKET CODE]",
  );
});

test("unsafe custom regex constructs are rejected", () => {
  assert.equal(validateSafePattern("(a+)+$") !== null, true);
  assert.equal(validateSafePattern("a.*b") !== null, true);
  assert.equal(validateSafePattern("\\b[A-Z]{2}\\d{6}\\b"), null);
});

test("risk score rises with higher-impact finding types", () => {
  const findings = detectSensitiveData(
    "Email: alex@example.test\nPAN: ABCDE1234F\nCard: 4111 1111 1111 1111",
  );
  const risk = calculateRisk(findings);
  assert.equal(risk.level, "high");
  assert.ok(risk.score >= 60);
  assert.match(risk.explanation, /not guarantees/i);
});

test("assistant prompt excludes detected sensitive values and document text", () => {
  const prompt = buildPrivacyAssistantPrompt(
    "What should I do with alex@example.test and PAN ABCDE1234F?",
    {
      riskLevel: "high",
      riskScore: 72,
      findingCounts: [{ type: "id_number", label: "PAN number", count: 1 }],
    },
    [],
  );
  assert.equal(prompt.includes("alex@example.test"), false);
  assert.equal(prompt.includes("ABCDE1234F"), false);
  assert.equal(prompt.includes("original document text and masked document text are not provided"), true);
  assert.equal(prompt.includes("riskScore"), true);
});

test("downloadable report contains scan analysis but no document text", () => {
  const report = buildPrivacyReport({
    scanId: "scan-123",
    createdAt: new Date("2026-10-26T10:00:00.000Z"),
    format: "txt",
    status: "completed",
    riskScore: 38,
    riskLevel: "medium",
    findingsCount: 1,
    selectedCount: 1,
    riskExplanation: "Medium risk. One possible finding.",
    findingCounts: [{ label: "Email address", count: 1 }],
  });
  assert.match(report, /Risk score: 38\/100 \(MEDIUM\)/);
  assert.match(report, /Email address: 1/);
  assert.doesNotMatch(report, /alex@example\.test/);
  assert.match(report, /not a guarantee of privacy/i);
});
