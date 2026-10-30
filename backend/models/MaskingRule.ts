import mongoose, { Document, Schema } from 'mongoose';

export interface IMaskingRule extends Document {
  ruleId: string;
  name: string;
  category: string;
  description: string;
  defaultStrategy: 'REDACT' | 'CATEGORY_TAG' | 'PARTIAL_MASK' | 'SYNTHETIC' | 'CRYPTOGRAPHIC_HASH';
  customReplacement?: string;
  isEnabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  regulations: string[]; // ['GDPR', 'HIPAA', 'PCI-DSS', 'CCPA']
  createdAt: Date;
  updatedAt: Date;
}

const MaskingRuleSchema = new Schema<IMaskingRule>(
  {
    ruleId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    defaultStrategy: {
      type: String,
      enum: ['REDACT', 'CATEGORY_TAG', 'PARTIAL_MASK', 'SYNTHETIC', 'CRYPTOGRAPHIC_HASH'],
      default: 'CATEGORY_TAG',
    },
    customReplacement: { type: String },
    isEnabled: { type: Boolean, default: true },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    regulations: [{ type: String }],
  },
  { timestamps: true }
);

export const MaskingRuleModel: mongoose.Model<IMaskingRule> =
  (mongoose.models.MaskingRule as mongoose.Model<IMaskingRule>) ||
  mongoose.model<IMaskingRule>('MaskingRule', MaskingRuleSchema);