import { Request, Response } from 'express';
import {
  DeterministicDetector,
  CATEGORY_METADATA,
  EntityCategory,
  SeverityLevel,
} from '../services/detector.service.ts';
import {
  DeterministicMasker,
  MaskingStrategy,
  MaskingConfig,
} from '../services/masker.service.ts';
import { StorageService } from '../services/storage.service.ts';

function calculateRisk(
  totalEntities: number,
  categoryCounts: Record<string, number>
): { riskLevel: 'low' | 'medium' | 'high' | 'critical'; riskScore: number } {
  if (totalEntities === 0) {
    return { riskLevel: 'low', riskScore: 0 };
  }

  let score = 0;
  for (const [cat, count] of Object.entries(categoryCounts)) {
    const meta = CATEGORY_METADATA[cat as EntityCategory];
    const weight = meta?.severity === 'critical' ? 30 : meta?.severity === 'high' ? 20 : meta?.severity === 'medium' ? 10 : 5;
    score += weight * count;
  }

  const normalizedScore = Math.min(Math.round(score), 100);

  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (normalizedScore >= 75 || categoryCounts['SSN_NATIONAL_ID'] || categoryCounts['API_KEY_SECRET']) {
    riskLevel = 'critical';
  } else if (normalizedScore >= 45 || categoryCounts['CREDIT_CARD'] || categoryCounts['DATE_OF_BIRTH']) {
    riskLevel = 'high';
  } else if (normalizedScore >= 20) {
    riskLevel = 'medium';
  }

  return { riskLevel, riskScore: normalizedScore };
}

export class MaskController {
  /**
   * Process raw text masking
   */
  public static async maskText(req: Request, res: Response) {
    const startTime = Date.now();
    try {
      const {
        text,
        title = 'Interactive Text Scan',
        strategy = 'CATEGORY_TAG',
        categoryOverrides = {},
        enabledCategories,
        customSalt,
        saveAudit = true,
      } = req.body;

      if (typeof text !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Input text is required and must be a string.',
        });
      }

      // 1. Run Deterministic Detection
      const entities = DeterministicDetector.detect(text, {
        enabledCategories: enabledCategories as EntityCategory[],
      });

      // 2. Run Deterministic Masking
      const maskingConfig: MaskingConfig = {
        globalStrategy: strategy as MaskingStrategy,
        categoryOverrides,
        customSalt,
      };

      const { maskedText, transformationMap } = DeterministicMasker.mask(
        text,
        entities,
        maskingConfig
      );

      const executionTimeMs = Date.now() - startTime;

      // 3. Compute Category Aggregations & Risk Metrics
      const categoryCounts: Record<string, number> = {};
      const categoriesSummary: Array<{ category: string; count: number; severity: SeverityLevel }> = [];

      for (const ent of entities) {
        categoryCounts[ent.category] = (categoryCounts[ent.category] || 0) + 1;
      }

      for (const [cat, count] of Object.entries(categoryCounts)) {
        categoriesSummary.push({
          category: cat,
          count,
          severity: CATEGORY_METADATA[cat as EntityCategory]?.severity || 'medium',
        });
      }

      const { riskLevel, riskScore } = calculateRisk(entities.length, categoryCounts);

      // 4. Safe Audit Record (Notice: NEVER persist the raw text)
      let auditRecord: any = null;
      if (saveAudit) {
        const maskedExcerpt = maskedText.length > 250 ? `${maskedText.substring(0, 247)}...` : maskedText;
        auditRecord = await StorageService.recordScanAudit({
          userId: req.user?.id,
          userEmail: req.user?.email || 'unauthenticated_session@privyshield.local',
          title,
          inputType: 'text',
          characterCount: text.length,
          wordCount: text.split(/\s+/).filter(Boolean).length,
          totalEntitiesDetected: entities.length,
          categories: categoriesSummary,
          riskLevel,
          riskScore,
          maskingStrategyUsed: strategy,
          maskedExcerpt,
          executionTimeMs,
        });
      }

      return res.json({
        success: true,
        data: {
          maskedText,
          entitiesCount: entities.length,
          entities: entities.map((ent) => ({
  id: ent.id,
  category: ent.category,
  categoryLabel: ent.categoryLabel,
  startIndex: ent.startIndex,
  endIndex: ent.endIndex,
  confidence: ent.confidence,
  severity: ent.severity,
  ruleTriggered: ent.ruleTriggered,
})),

transformations: transformationMap.map((trans) => ({
  id: trans.id,
  category: trans.category,
  maskedSnippet: trans.maskedSnippet,
  strategyApplied: trans.strategyApplied,
})),
          statistics: {
            characterCount: text.length,
            wordCount: text.split(/\s+/).filter(Boolean).length,
            executionTimeMs,
            riskLevel,
            riskScore,
            categories: categoriesSummary,
          },
          auditId: auditRecord?._id || auditRecord?.id,
        },
      });
    } catch (err: any) {
      console.error('[Mask Text Error]', err);
      return res.status(500).json({
        success: false,
        error: `Processing failed: ${err.message}`,
      });
    }
  }

  /**
   * Process uploaded document file (.txt, .csv, .json, .log, .md)
   */
  public static async maskDocument(req: Request, res: Response) {
    const startTime = Date.now();
    try {
      const uploadedFile = (req as any).file;
      if (!uploadedFile) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded or file rejected by validator.',
        });
      }

      const rawBuffer = uploadedFile.buffer;
      const fileContent = rawBuffer.toString('utf-8');
      const fileName = uploadedFile.originalname;
      const fileSize = uploadedFile.size;

      const strategy = (req.body.strategy as MaskingStrategy) || 'CATEGORY_TAG';
      const title = req.body.title || `Document Scan: ${fileName}`;

      // 1. Detection
      const entities = DeterministicDetector.detect(fileContent);

      // 2. Masking
      const { maskedText, transformationMap } = DeterministicMasker.mask(fileContent, entities, {
        globalStrategy: strategy,
      });

      const executionTimeMs = Date.now() - startTime;

      // 3. Category Metrics
      const categoryCounts: Record<string, number> = {};
      const categoriesSummary: Array<{ category: string; count: number; severity: SeverityLevel }> = [];

      for (const ent of entities) {
        categoryCounts[ent.category] = (categoryCounts[ent.category] || 0) + 1;
      }

      for (const [cat, count] of Object.entries(categoryCounts)) {
        categoriesSummary.push({
          category: cat,
          count,
          severity: CATEGORY_METADATA[cat as EntityCategory]?.severity || 'medium',
        });
      }

      const { riskLevel, riskScore } = calculateRisk(entities.length, categoryCounts);

      // 4. Safe Audit Record without raw file content
      const maskedExcerpt = maskedText.length > 250 ? `${maskedText.substring(0, 247)}...` : maskedText;
      const auditRecord = await StorageService.recordScanAudit({
        userId: req.user?.id,
        userEmail: req.user?.email || 'unauthenticated_session@privyshield.local',
        title,
        inputType: 'file',
        fileName,
        fileSize,
        characterCount: fileContent.length,
        wordCount: fileContent.split(/\s+/).filter(Boolean).length,
        totalEntitiesDetected: entities.length,
        categories: categoriesSummary,
        riskLevel,
        riskScore,
        maskingStrategyUsed: strategy,
        maskedExcerpt,
        executionTimeMs,
      });

      return res.json({
        success: true,
        data: {
          fileName,
          fileSize,
          maskedText,
          entitiesCount: entities.length,
          entities: entities.map((ent) => ({
            id: ent.id,
            category: ent.category,
            categoryLabel: ent.categoryLabel,
            startIndex: ent.startIndex,
            endIndex: ent.endIndex,
            confidence: ent.confidence,
            severity: ent.severity,
            ruleTriggered: ent.ruleTriggered,
          })),
          transformations: transformationMap.map((trans) => ({
            id: trans.id,
            category: trans.category,
            maskedSnippet: trans.maskedSnippet,
            strategyApplied: trans.strategyApplied,
          })),
          statistics: {
            characterCount: fileContent.length,
            wordCount: fileContent.split(/\s+/).filter(Boolean).length,
            executionTimeMs,
            riskLevel,
            riskScore,
            categories: categoriesSummary,
          },
          auditId: auditRecord?._id?.toString(),
        },
      });
    } catch (err: any) {
      console.error('[Mask Document Error]', err);
      return res.status(500).json({
        success: false,
        error: `File processing failed: ${err.message}`,
      });
    }
  }

  /**
   * Get supported entity types and strategies catalog
   */
  public static getCatalog(req: Request, res: Response) {
    return res.json({
      success: true,
      categories: Object.entries(CATEGORY_METADATA).map(([key, val]) => ({
        id: key,
        ...val,
      })),
      strategies: [
        {
          id: 'REDACT',
          name: 'Solid Redaction',
          description: 'Replaces sensitive text with solid block brackets e.g. [REDACTED]. Maximum security.',
          recommendedFor: 'API Keys, Passwords, SSN',
        },
        {
          id: 'CATEGORY_TAG',
          name: 'Category Tagging',
          description: 'Substitutes with semantic entity tokens e.g. <EMAIL_ADDRESS>, <PHONE_NUMBER>. Ideal for LLM training.',
          recommendedFor: 'Emails, Phone Numbers, Addresses',
        },
        {
          id: 'PARTIAL_MASK',
          name: 'Partial Masking (Format-Preserving)',
          description: 'Obfuscates core components while retaining prefixes/suffixes e.g. j***e@domain.com or •••• 4242.',
          recommendedFor: 'Credit Cards, Customer Support Verification',
        },
        {
          id: 'SYNTHETIC',
          name: 'Synthetic Pseudonymization',
          description: 'Replaces with realistic synthetic placeholders that mimic syntactic format.',
          recommendedFor: 'Software Testing, QA Demos, Synthetic Datasets',
        },
        {
          id: 'CRYPTOGRAPHIC_HASH',
          name: 'Cryptographic Token Hash',
          description: 'Deterministic keyed HMAC-SHA256 token e.g. [HASH:9a7f3c]. Enables cross-log joins without leaking PII.',
          recommendedFor: 'Data Analytics, Distributed Tracing, Deduplication',
        },
      ],
    });
  }
}
