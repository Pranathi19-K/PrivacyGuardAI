export interface PrivacyReportData {
  scanId: string;
  createdAt: Date;
  format: "pdf" | "txt";
  status: string;
  riskScore: number;
  riskLevel: string;
  findingsCount: number;
  selectedCount: number;
  riskExplanation: string;
  findingCounts: Array<{ label: string; count: number }>;
}

export function buildPrivacyReport(scan: PrivacyReportData): string {
  const findings = scan.findingCounts
    .map((item) => {
      const label = item.label.replace(/[\u0000-\u001f\u007f]/g, " ");
      return `- ${label}: ${item.count}`;
    })
    .join("\n");

  return [
    "# PrivacyGuard AI — Privacy Analysis",
    "",
    `Scan ID: ${scan.scanId}`,
    `Created: ${scan.createdAt.toISOString()}`,
    `Document format: ${scan.format.toUpperCase()}`,
    `Review status: ${scan.status.replaceAll("_", " ")}`,
    `Risk score: ${scan.riskScore}/100 (${scan.riskLevel.toUpperCase()})`,
    `Possible findings: ${scan.findingsCount}`,
    `Selected for masking: ${scan.selectedCount}`,
    "",
    "## Risk explanation",
    scan.riskExplanation,
    "",
    "## Findings",
    findings || "- No supported sensitive-data patterns were detected.",
    "",
    "## Privacy notes",
    "- Original document text is not included in this report or stored in scan history.",
    "- Detection can miss sensitive information. Unselected findings remain unmasked in the document output.",
    "- This analysis is not a guarantee of privacy or legal compliance.",
    "",
  ].join("\n");
}
