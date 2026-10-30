import mongoose, { Document, Schema } from 'mongoose';

export type UserRole = 'admin' | 'compliance_officer' | 'analyst' | 'viewer';

export interface IUserPreferences {
  defaultStrategy: 'REDACT' | 'CATEGORY_TAG' | 'PARTIAL_MASK' | 'SYNTHETIC' | 'CRYPTOGRAPHIC_HASH';
  notifyOnHighRisk: boolean;
  preserveFormatting: boolean;
}

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  organization: string;
  department?: string;
  preferences: IUserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'compliance_officer', 'analyst', 'viewer'],
      default: 'analyst',
    },
    organization: { type: String, default: 'Enterprise Privacy Group' },
    department: { type: String, default: 'Data Governance' },
    preferences: {
      defaultStrategy: {
        type: String,
        enum: ['REDACT', 'CATEGORY_TAG', 'PARTIAL_MASK', 'SYNTHETIC', 'CRYPTOGRAPHIC_HASH'],
        default: 'CATEGORY_TAG',
      },
      notifyOnHighRisk: { type: Boolean, default: true },
      preserveFormatting: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export const UserModel: mongoose.Model<IUser> =
  (mongoose.models.User as mongoose.Model<IUser>) ||
  mongoose.model<IUser>('User', UserSchema);
