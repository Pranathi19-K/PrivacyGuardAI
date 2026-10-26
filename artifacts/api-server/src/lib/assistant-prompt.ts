import {
  detectSensitiveData,
  maskedTextForFindings,
  type RuleInput,
} from "./scan-engine";

export interface AssistantScanMetadata {
  riskLevel: string;
  riskScore: number;
  findingCounts: Array<{ type: string; label: string; count: number }>;
}

export function buildPrivacyAssistantPrompt(
  question: string,
  metadata: AssistantScanMetadata,
  rules: RuleInput[],
): string {
  const findings = detectSensitiveData(question, {
    detectNames: true,
    rules,
  });
  const sanitizedQuestion = maskedTextForFindings(
    question,
    findings,
    new Set(findings.map((finding) => finding.id)),
    "redact",
  );

  return [
    "You are the PrivacyGuard AI assistant. Answer a user's question about a document privacy scan.",
    "Use only the scan metadata below. Do not infer document contents, identity, legal compliance, or guarantee privacy.",
    "The original document text and masked document text are not provided.",
    `Scan metadata: ${JSON.stringify(metadata)}`,
    `Sanitized question: ${sanitizedQuestion}`,
  ].join("\n\n");
}
