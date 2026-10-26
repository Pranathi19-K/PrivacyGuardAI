import mongoose, { Schema, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, maxlength: 254 },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true },
);

const findingCountSchema = new Schema(
  {
    type: { type: String, required: true },
    label: { type: String, required: true },
    count: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const scanSchema = new Schema(
  {
    ownerId: { type: String, required: true, index: true },
    filename: { type: String, required: true, maxlength: 255 },
    format: { type: String, enum: ["pdf", "txt"], required: true },
    status: { type: String, enum: ["pending_review", "completed", "expired"], required: true },
    findingsCount: { type: Number, required: true, min: 0 },
    riskScore: { type: Number, required: true, min: 0, max: 100 },
    riskLevel: { type: String, enum: ["low", "medium", "high"], required: true },
    riskExplanation: { type: String, required: true, maxlength: 1000 },
    findingCounts: { type: [findingCountSchema], default: [] },
    selectedCount: { type: Number, default: 0, min: 0 },
    maskedText: { type: String, default: "", maxlength: 1_000_000 },
    maskedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const detectionRuleSchema = new Schema(
  {
    ownerId: { type: String, required: true, index: true },
    label: { type: String, required: true, maxlength: 60 },
    pattern: { type: String, required: true, maxlength: 200 },
    maskWith: { type: String, required: true, maxlength: 50 },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const auditSchema = new Schema(
  {
    ownerId: { type: String, required: true, index: true },
    action: { type: String, required: true, maxlength: 80 },
    scanId: { type: String, default: null },
    detail: { type: String, required: true, maxlength: 300 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export type UserRecord = InferSchemaType<typeof userSchema>;
export type ScanRecord = InferSchemaType<typeof scanSchema>;
export type RuleRecord = InferSchemaType<typeof detectionRuleSchema>;
export type AuditRecord = InferSchemaType<typeof auditSchema>;

export const UserModel =
  mongoose.models.User ?? mongoose.model("User", userSchema);
export const ScanModel =
  mongoose.models.PrivacyScan ?? mongoose.model("PrivacyScan", scanSchema);
export const DetectionRuleModel =
  mongoose.models.DetectionRule ?? mongoose.model("DetectionRule", detectionRuleSchema);
export const AuditModel =
  mongoose.models.PrivacyAudit ?? mongoose.model("PrivacyAudit", auditSchema);
