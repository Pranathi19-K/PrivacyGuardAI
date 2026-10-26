import { AuditModel } from "./models";

export async function recordAudit(
  ownerId: string,
  action: string,
  detail: string,
  scanId: string | null = null,
): Promise<void> {
  await AuditModel.create({ ownerId, action, detail, scanId });
}

export function auditResponse(record: {
  id?: string;
  _id: { toString(): string };
  action: string;
  scanId: string | null;
  detail: string;
  createdAt: Date;
}) {
  return {
    id: record.id ?? record._id.toString(),
    action: record.action,
    scanId: record.scanId,
    detail: record.detail,
    createdAt: record.createdAt.toISOString(),
  };
}
