import type { Finding, RuleInput } from "./scan-engine";

const DRAFT_TTL_MS = 30 * 60 * 1000;

export interface ScanDraft {
  scanId: string;
  ownerId: string;
  filename: string;
  format: "pdf" | "txt";
  originalText: string;
  findings: Finding[];
  rules: RuleInput[];
  createdAt: Date;
  expiresAt: number;
}

const drafts = new Map<string, ScanDraft>();

export function saveScanDraft(
  draft: Omit<ScanDraft, "expiresAt">,
): ScanDraft {
  const stored = { ...draft, expiresAt: Date.now() + DRAFT_TTL_MS };
  drafts.set(draft.scanId, stored);
  return stored;
}

export function getScanDraft(scanId: string, ownerId: string): ScanDraft | null {
  const draft = drafts.get(scanId);
  if (!draft) return null;
  if (draft.expiresAt <= Date.now()) {
    drafts.delete(scanId);
    return null;
  }
  return draft.ownerId === ownerId ? draft : null;
}

export function deleteScanDraft(scanId: string): void {
  drafts.delete(scanId);
}

export function clearUserScanDrafts(ownerId: string): void {
  for (const [scanId, draft] of drafts) {
    if (draft.ownerId === ownerId) drafts.delete(scanId);
  }
}

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [scanId, draft] of drafts) {
    if (draft.expiresAt <= now) drafts.delete(scanId);
  }
}, 5 * 60 * 1000);
cleanupTimer.unref();
