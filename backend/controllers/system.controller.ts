import { Request, Response } from 'express';
import { getDatabaseStatus, connectDatabase } from '../config/db.ts';
import { getGeminiStatus } from '../config/gemini.ts';

export class SystemController {
  public static getStatus(req: Request, res: Response) {
    const dbStatus = getDatabaseStatus();
    const geminiStatus = getGeminiStatus();

    return res.json({
      success: true,
      service: 'PrivyShield AI â€“ AI-Powered Sensitive Data Masking & Privacy Protection Platform',
      version: '2.5.0-enterprise',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      integrations: {
        database: {
          provider: 'MongoDB Atlas',
          connected: dbStatus.connected,
          state: dbStatus.state,
          host: dbStatus.host || null,
          databaseName: dbStatus.databaseName || null,
          message: dbStatus.message,
          usingInMemoryFallback: dbStatus.usingInMemoryFallback,
        },
        generativeAi: {
          provider: 'Google Gemini',
          available: geminiStatus.available,
          model: geminiStatus.model,
          message: geminiStatus.message,
        },
        maskingEngine: {
          type: 'Deterministic Backend Rule Engine',
          status: 'operational',
          algorithms: ['Luhn-Checksum', 'RFC5322-Regex', 'E.164-Phone', 'HMAC-SHA256-Salted-Tokenization'],
        },
      },
      disclaimer:
        'PrivyShield AI provides heuristic sensitive data detection and automated masking. It is a defense-in-depth utility and does not constitute absolute legal compliance or guarantee complete automated redaction.',
    });
  }

  public static async reconnectDatabase(req: Request, res: Response) {
    try {
      const { uri } = req.body;
      if (uri && typeof uri === 'string') {
        process.env.MONGODB_URI = uri.trim();
      }

      const status = await connectDatabase();
      return res.json({
        success: status.connected,
        status,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: `Database connection attempt failed: ${err.message}`,
      });
    }
  }

  public static getApiDocs(req: Request, res: Response) {
    return res.json({
      title: 'PrivyShield AI Privacy API Specification',
      version: 'v1',
      baseUrl: '/api',
      endpoints: [
        {
          path: '/api/mask/text',
          method: 'POST',
          description: 'Detects and masks sensitive entities from raw text deterministically.',
          authentication: 'Optional (logs to user profile if Bearer token is provided)',
          body: {
            text: 'string (required)',
            title: 'string (optional)',
            strategy: 'REDACT | CATEGORY_TAG | PARTIAL_MASK | SYNTHETIC | CRYPTOGRAPHIC_HASH',
            enabledCategories: 'string[] (optional)',
            customSalt: 'string (optional for HMAC)',
          },
        },
        {
          path: '/api/mask/document',
          method: 'POST',
          description: 'Uploads and processes a text document (.txt, .csv, .json, .log, .md).',
          contentType: 'multipart/form-data (field: document)',
          authentication: 'Optional',
        },
        {
          path: '/api/ai/evaluate-risk',
          method: 'POST',
          description: 'Gemini-powered privacy risk assessment and regulatory compliance breakdown.',
        },
        {
          path: '/api/ai/assistant/chat',
          method: 'POST',
          description: 'Interactive conversation with the AI Privacy Assistant.',
        },
        {
          path: '/api/auth/register',
          method: 'POST',
          description: 'Registers a new enterprise user with specified role.',
        },
        {
          path: '/api/auth/login',
          method: 'POST',
          description: 'Authenticates user and returns JWT token.',
        },
        {
          path: '/api/history/audits',
          method: 'GET',
          description: 'Fetches scan history metadata (zero raw PII persisted).',
        },
        {
          path: '/api/history/stats',
          method: 'GET',
          description: 'Returns real-time dashboard telemetry and aggregated category counts.',
        },
      ],
      sampleTestData: [
        {
          id: 'sample-patient-intake',
          title: 'Healthcare Patient Record',
          category: 'HIPAA & Medical PII',
          content:
            'Patient Intake Form:\nPatient: Jonathan Davis\nDOB: 04/18/1979\nSSN: 921-48-2910\nPhone: (415) 555-8921\nEmail: j.davis79@medical-archive.org\nAddress: 482 Willow Creek Way, Austin, TX 78701\nDiagnosis: Hyperlipidemia. Prescribed statin regimen.',
        },
        {
          id: 'sample-fintech-wire',
          title: 'Financial Wire & Payment Transfer',
          category: 'PCI-DSS & Banking',
          content:
            'TRANSACTION RECEIPT:\nCustomer Name: Elizabeth Vance\nCard Number: 4532 8920 1928 4242\nBilling Email: e.vance@vancetech.com\nContact Phone: +1-202-555-0193\nAmount: $4,850.00 USD\nReference Authorization: AKIAIOSFODNN7EXAMPLE',
        },
        {
          id: 'sample-devops-log',
          title: 'DevOps Server Log Leak',
          category: 'Credentials & Infrastructure',
          content:
            '[2026-10-27 10:14:02 UTC] [ERROR] [auth-service]\nFailed authentication from host 192.168.1.105.\nClient payload contained secret token: api_key="[REDACTED_STRIPE_SECRET]"\nAdmin user contact: devops-oncall@cloudmatrix.io\nInternal server IP: 10.0.4.88',
        },
      ],
    });
  }
}

