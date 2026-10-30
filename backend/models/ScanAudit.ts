import mongoose, { Document, Schema } from 'mongoose';

export interface IDetectedCategorySummary {
  category: string;
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface IScanAudit extends Document {
  userId?: string;
  userEmail?: string;
  title: string;
  inputType: 'text' | 'file';
  fileName?: string;
  fileSize?: number;
  characterCount: number;
  wordCount: number;
  totalEntitiesDetected: number;
  categories: IDetectedCategorySummary[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // 0 - 100
  maskingStrategyUsed: string;
  maskedExcerpt: string; // Zero raw sensitive data stored
  executionTimeMs: number;
  createdAt: Date;
  updatedAt: Date;
}

const ScanAuditSchema = new Schema<IScanAudit>(
  {
    userId: { type: String, index: true },
    userEmail: { type: String },
    title: { type: String, required: true },
    inputType: { type: String, enum: ['text', 'file'], default: 'text' },
    fileName: { type: String },
    fileSize: { type: Number },
    characterCount: { type: Number, default: 0 },
    wordCount: { type: Number, default: 0 },
    totalEntitiesDetected: { type: Number, default: 0 },
    categories: [
      {
        category: { type: String, required: true },
        count: { type: Number, required: true },
        severity: {
          type: String,
          enum: ['low', 'medium', 'high', 'critical'],
          default: 'medium',
        },
      },
    ],
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
    },
    riskScore: { type: Number, default: 0 },
    maskingStrategyUsed: { type: String, required: true },
    maskedExcerpt: { type: String, default: '' },
    executionTimeMs: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const ScanAuditModel: mongoose.Model<IScanAudit> =
  (mongoose.models.ScanAudit as mongoose.Model<IScanAudit>) ||
  mongoose.model<IScanAudit>('ScanAudit', ScanAuditSchema);