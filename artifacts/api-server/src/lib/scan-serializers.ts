import type { ScanRecord } from "./models";

export function scanSummary(scan: ScanRecord & { _id: { toString(): string } }) {
  return {
    id: scan._id.toString(),
    filename: scan.filename,
    format: scan.format,
    createdAt: scan.createdAt.toISOString(),
    status: scan.status,
    findingsCount: scan.findingsCount,
    riskScore: scan.riskScore,
    riskLevel: scan.riskLevel,
    maskedAt: scan.maskedAt ? scan.maskedAt.toISOString() : null,
  };
}

export function scanDetail(scan: ScanRecord & { _id: { toString(): string } }) {
  return {
    ...scanSummary(scan),
    riskExplanation: scan.riskExplanation,
    findingCounts: scan.findingCounts.map((item) => ({
      type: item.type,
      label: item.label,
      count: item.count,
    })),
    maskedText: scan.maskedText,
    selectedCount: scan.selectedCount,
  };
}
