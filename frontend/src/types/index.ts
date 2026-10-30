export type UserRole = 'admin' | 'compliance_officer' | 'analyst' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organization?: string;
  department?: string;
  preferences?: {
    defaultStrategy: string;
    notifyOnHighRisk: boolean;
    preserveFormatting: boolean;
  };
}

export type EntityCategory =
  | 'EMAIL'
  | 'PHONE'
  | 'SSN_NATIONAL_ID'
  | 'CREDIT_CARD'
  | 'IP_ADDRESS'
  | 'API_KEY_SECRET'
  | 'DATE_OF_BIRTH'
  | 'PERSON_NAME'
  | 'PHYSICAL_ADDRESS';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export type MaskingStrategy =
  | 'REDACT'
  | 'CATEGORY_TAG'
  | 'PARTIAL_MASK'
  | 'SYNTHETIC'
  | 'CRYPTOGRAPHIC_HASH';

export interface DetectedEntity {
  id: string;
  category: EntityCategory;
  categoryLabel: string;
  originalValue: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
  severity: SeverityLevel;
  ruleTriggered: string;
}

export interface MaskResult {
  maskedText: string;
  entitiesCount: number;
  entities: DetectedEntity[];
  transformations: Array<{
    id: string;
    category: EntityCategory;
    originalSnippet: string;
    maskedSnippet: string;
    strategyApplied: MaskingStrategy;
  }>;
  statistics: {
    characterCount: number;
    wordCount: number;
    executionTimeMs: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    riskScore: number;
    categories: Array<{
      category: string;
      count: number;
      severity: SeverityLevel;
    }>;
  };
  auditId?: string;
  fileName?: string;
  fileSize?: number;
}

export interface ScanAudit {
  _id: string;
  id?: string;
  title: string;
  inputType: 'text' | 'file';
  fileName?: string;
  fileSize?: number;
  characterCount: number;
  wordCount: number;
  totalEntitiesDetected: number;
  categories: Array<{
    category: string;
    count: number;
    severity: SeverityLevel;
  }>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  maskingStrategyUsed: string;
  maskedExcerpt: string;
  executionTimeMs: number;
  userEmail?: string;
  createdAt: string;
}

export interface SystemHealthStatus {
  service: string;
  version: string;
  timestamp: string;
  uptimeSeconds: number;
  integrations: {
    database: {
      provider: string;
      connected: boolean;
      state: 'connected' | 'connecting' | 'disconnected' | 'unconfigured';
      host?: string;
      databaseName?: string;
      message: string;
      usingInMemoryFallback: boolean;
    };
    generativeAi: {
      provider: string;
      available: boolean;
      model: string;
      message: string;
    };
    maskingEngine: {
      type: string;
      status: string;
      algorithms: string[];
    };
  };
  disclaimer: string;
}

export interface PrivacyRiskAnalysis {
  riskScore: number;
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  executiveSummary: string;
  identifiedRiskVectors: Array<{
    title: string;
    description: string;
    affectedCategory: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  regulatoryImpacts: Array<{
    regulation: string;
    applicability: string;
    safeguardRequirements: string;
  }>;
  recommendedStrategies: Array<{
    category: string;
    recommendedStrategy: string;
    rationale: string;
  }>;
  dataMinimizationNotice: string;
  disclaimer: string;
}
