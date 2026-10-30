import bcrypt from 'bcryptjs';
import { getDatabaseStatus } from '../config/db.ts';
import { UserModel, IUser, UserRole } from '../models/User.ts';
import { ScanAuditModel, IScanAudit } from '../models/ScanAudit.ts';
import { MaskingRuleModel, IMaskingRule } from '../models/MaskingRule.ts';
import { CATEGORY_METADATA, EntityCategory } from './detector.service.ts';

// In-memory fallback stores when MongoDB is in standby / unconfigured
const memoryUsers: Array<{
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  organization: string;
  department: string;
  preferences: {
    defaultStrategy: any;
    notifyOnHighRisk: boolean;
    preserveFormatting: boolean;
  };
  createdAt: Date;
}> = [];

const memoryAudits: Array<any> = [];

const memoryRules: Array<any> = Object.entries(CATEGORY_METADATA).map(([cat, meta], idx) => ({
  ruleId: `RULE-${idx + 101}`,
  name: `${meta.label} Shield`,
  category: cat,
  description: meta.description,
  defaultStrategy: meta.defaultStrategy,
  isEnabled: true,
  severity: meta.severity,
  regulations: cat === 'CREDIT_CARD' ? ['PCI-DSS', 'GDPR'] : cat === 'SSN_NATIONAL_ID' ? ['GDPR', 'HIPAA', 'CCPA'] : ['GDPR', 'CCPA'],
  createdAt: new Date(),
}));

// Pre-seed a default demo admin and compliance officer in memory for quick zero-setup testing
(async () => {
  const hash = await bcrypt.hash('Admin@12345', 10);
  memoryUsers.push({
    id: 'user-demo-admin-01',
    name: 'Sarah Connor',
    email: 'admin@privyshield.io',
    passwordHash: hash,
    role: 'admin',
    organization: 'CyberSec Global Ops',
    department: 'Privacy Engineering',
    preferences: {
      defaultStrategy: 'CATEGORY_TAG',
      notifyOnHighRisk: true,
      preserveFormatting: true,
    },
    createdAt: new Date(),
  });

  const hashOfficer = await bcrypt.hash('Compliance@123', 10);
  memoryUsers.push({
    id: 'user-demo-officer-02',
    name: 'David Vance',
    email: 'compliance@privyshield.io',
    passwordHash: hashOfficer,
    role: 'compliance_officer',
    organization: 'FinTech Compliance Corp',
    department: 'Risk Governance',
    preferences: {
      defaultStrategy: 'PARTIAL_MASK',
      notifyOnHighRisk: true,
      preserveFormatting: true,
    },
    createdAt: new Date(),
  });

  // Sample audits for initial telemetry
  memoryAudits.push({
    _id: 'audit-seed-01',
    title: 'Customer Onboarding CSV Batch',
    inputType: 'file',
    fileName: 'users_sample_export.csv',
    fileSize: 14200,
    characterCount: 14200,
    wordCount: 1850,
    totalEntitiesDetected: 18,
    categories: [
      { category: 'EMAIL', count: 8, severity: 'medium' },
      { category: 'PHONE', count: 6, severity: 'medium' },
      { category: 'CREDIT_CARD', count: 4, severity: 'critical' },
    ],
    riskLevel: 'high',
    riskScore: 78,
    maskingStrategyUsed: 'PARTIAL_MASK',
    maskedExcerpt: 'CustomerID,Email,Phone,CardNumber\n101,j****@domain.com,(***) ***-8291,•••• •••• •••• 4012',
    executionTimeMs: 14,
    createdAt: new Date(Date.now() - 3600000 * 2),
  });

  memoryAudits.push({
    _id: 'audit-seed-02',
    title: 'Support Ticket Incident #40892',
    inputType: 'text',
    characterCount: 420,
    wordCount: 65,
    totalEntitiesDetected: 3,
    categories: [
      { category: 'EMAIL', count: 1, severity: 'medium' },
      { category: 'API_KEY_SECRET', count: 2, severity: 'critical' },
    ],
    riskLevel: 'critical',
    riskScore: 92,
    maskingStrategyUsed: 'REDACT',
    maskedExcerpt: 'Client submitted log with authorization key: [REDACTED] and support contact <EMAIL>.',
    executionTimeMs: 6,
    createdAt: new Date(Date.now() - 3600000 * 5),
  });
})();

export class StorageService {
  // ---- USERS ----
  public static async findUserByEmail(email: string) {
    const db = getDatabaseStatus();
    if (db.connected) {
      try {
        return await UserModel.findOne({ email: email.toLowerCase() });
      } catch (e) {
        console.warn('MongoDB query failed, checking memory fallback');
      }
    }
    return memoryUsers.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  public static async findUserById(id: string) {
    const db = getDatabaseStatus();
    if (db.connected) {
      try {
        return await UserModel.findById(id);
      } catch (e) {
        console.warn('MongoDB query failed, checking memory fallback');
      }
    }
    return memoryUsers.find((u) => u.id === id) || null;
  }

  public static async createUser(userData: {
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    organization?: string;
    department?: string;
    preferences?: any;
  }) {
    const db = getDatabaseStatus();
    if (db.connected) {
      try {
        const user = new UserModel({
          ...userData,
          email: userData.email.toLowerCase(),
        });
        return await user.save();
      } catch (e) {
        console.warn('MongoDB save failed, saving to memory fallback', e);
      }
    }

    const newUser = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: userData.name,
      email: userData.email.toLowerCase(),
      passwordHash: userData.passwordHash,
      role: userData.role,
      organization: userData.organization || 'PrivyShield AI Enterprise',
      department: userData.department || 'Data Security',
      preferences: userData.preferences || {
        defaultStrategy: 'CATEGORY_TAG',
        notifyOnHighRisk: true,
        preserveFormatting: true,
      },
      createdAt: new Date(),
    };
    memoryUsers.push(newUser);
    return newUser;
  }

  public static async listUsers() {
    const db = getDatabaseStatus();
    if (db.connected) {
      try {
        return await UserModel.find().select('-passwordHash').sort({ createdAt: -1 });
      } catch (e) {
        console.warn('MongoDB query failed, falling back to memory');
      }
    }
    return memoryUsers.map(({ passwordHash, ...safe }) => safe);
  }

  // ---- SCAN AUDITS ----
  public static async recordScanAudit(auditData: {
    userId?: string;
    userEmail?: string;
    title: string;
    inputType: 'text' | 'file';
    fileName?: string;
    fileSize?: number;
    characterCount: number;
    wordCount: number;
    totalEntitiesDetected: number;
    categories: Array<{ category: string; count: number; severity: any }>;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    riskScore: number;
    maskingStrategyUsed: string;
    maskedExcerpt: string;
    executionTimeMs: number;
  }) {
    const db = getDatabaseStatus();
    if (db.connected) {
      try {
        const audit = new ScanAuditModel(auditData);
        return await audit.save();
      } catch (e) {
        console.warn('MongoDB audit save failed, saving to memory', e);
      }
    }

    const newAudit = {
      _id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...auditData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryAudits.unshift(newAudit);
    return newAudit;
  }

  public static async getScanAudits(options: { limit?: number; search?: string } = {}) {
    const limit = options.limit || 50;
    const db = getDatabaseStatus();
    if (db.connected) {
      try {
        const query: any = {};
        if (options.search) {
          query.title = { $regex: options.search, $options: 'i' };
        }
        return await ScanAuditModel.find(query).sort({ createdAt: -1 }).limit(limit);
      } catch (e) {
        console.warn('MongoDB audit query failed, falling back to memory');
      }
    }

    let filtered = [...memoryAudits];
    if (options.search) {
      const q = options.search.toLowerCase();
      filtered = filtered.filter((a) => a.title.toLowerCase().includes(q) || a.maskedExcerpt?.toLowerCase().includes(q));
    }
    return filtered.slice(0, limit);
  }

  public static async getScanStats() {
    const db = getDatabaseStatus();
    let audits: any[] = [];
    if (db.connected) {
      try {
        audits = await ScanAuditModel.find().lean();
      } catch {
        audits = memoryAudits;
      }
    } else {
      audits = memoryAudits;
    }

    const totalScans = audits.length;
    let totalEntitiesProtected = 0;
    let highRiskScans = 0;
    const categoryTotals: Record<string, number> = {};

    for (const audit of audits) {
      totalEntitiesProtected += audit.totalEntitiesDetected || 0;
      if (audit.riskLevel === 'high' || audit.riskLevel === 'critical') {
        highRiskScans++;
      }
      if (Array.isArray(audit.categories)) {
        for (const cat of audit.categories) {
          categoryTotals[cat.category] = (categoryTotals[cat.category] || 0) + (cat.count || 0);
        }
      }
    }

    return {
      totalScans,
      totalEntitiesProtected,
      highRiskScans,
      cleanScans: audits.filter((a) => a.totalEntitiesDetected === 0).length,
      categoryBreakdown: categoryTotals,
      recentAudits: audits.slice(0, 5),
    };
  }

  public static async deleteScanAudit(id: string) {
    const db = getDatabaseStatus();
    if (db.connected) {
      try {
        return await ScanAuditModel.findByIdAndDelete(id);
      } catch {
        // fallback
      }
    }
    const idx = memoryAudits.findIndex((a) => a._id === id);
    if (idx !== -1) {
      return memoryAudits.splice(idx, 1)[0];
    }
    return null;
  }

  // ---- RULES ----
  public static async getRules() {
    const db = getDatabaseStatus();
    if (db.connected) {
      try {
        const rules = await MaskingRuleModel.find();
        if (rules && rules.length > 0) return rules;
      } catch {
        // fallback
      }
    }
    return memoryRules;
  }

  public static async updateRule(ruleId: string, updates: Partial<IMaskingRule>) {
    const db = getDatabaseStatus();
    if (db.connected) {
      try {
        return await MaskingRuleModel.findOneAndUpdate({ ruleId }, { $set: updates }, { new: true });
      } catch {
        // fallback
      }
    }
    const rule = memoryRules.find((r) => r.ruleId === ruleId);
    if (rule) {
      Object.assign(rule, updates);
      return rule;
    }
    return null;
  }
}
