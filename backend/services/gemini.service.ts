import { getGeminiClient, getGeminiStatus } from '../config/gemini.ts';
import { DetectedEntity, EntityCategory } from './detector.service.ts';

export interface PrivacyRiskAnalysis {
  riskScore: number; // 0-100
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  executiveSummary: string;
  identifiedRiskVectors: Array<{
    title: string;
    description: string;
    affectedCategory: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  regulatoryImpacts: Array<{
    regulation: string; // GDPR, HIPAA, PCI-DSS, CCPA
    applicability: string;
    safeguardRequirements: string;
  }>;
  recommendedStrategies: Array<{
    category: EntityCategory | string;
    recommendedStrategy: string;
    rationale: string;
  }>;
  dataMinimizationNotice: string;
  disclaimer: string;
}

export interface AssistantMessage {
  role: 'user' | 'model';
  text: string;
}

function parseGeminiErrorMessage(rawMessage: string): string {
  try {
    const parsed = JSON.parse(rawMessage);
    if (parsed?.error?.message) {
      const code = parsed.error.code ? ` [Code ${parsed.error.code}]` : '';
      return `${parsed.error.message}${code}`;
    }
  } catch {
    // Not a JSON string
  }
  return rawMessage;
}

export class GeminiPrivacyService {
  /**
   * Generates comprehensive privacy risk evaluation and masking recommendations.
   * Data minimization principle: Only sends summary metadata & entity types to the LLM,
   * avoiding exposing raw sensitive values to the model.
   */
  public static async evaluatePrivacyRisks(params: {
    categoryCounts: Record<string, number>;
    totalEntities: number;
    textLength: number;
    inputType: string;
    currentStrategy: string;
    sampleSanitizedContext?: string;
  }): Promise<PrivacyRiskAnalysis> {
    const gemini = getGeminiClient();
    const status = getGeminiStatus();

    const fallbackDisclaimer =
      'Notice: PrivyShield AI provides automated detection heuristics and risk assessments for guidance only. It does not constitute formal legal counsel or a guarantee of regulatory compliance under GDPR, HIPAA, or PCI-DSS.';

    if (!gemini || !status.available) {
      // Return clear diagnostic report when Gemini key is not configured
      return {
        riskScore: Math.min(params.totalEntities * 15, 95),
        overallRiskLevel: params.totalEntities > 5 ? 'high' : params.totalEntities > 1 ? 'medium' : 'low',
        executiveSummary: `Automated baseline evaluation: Found ${params.totalEntities} sensitive entities across categories (${Object.keys(params.categoryCounts).join(', ')}). Gemini AI connection is pending configuration to unlock deep contextual threat modeling.`,
        identifiedRiskVectors: Object.entries(params.categoryCounts).map(([cat, count]) => ({
          title: `Unprotected ${cat} Exposure`,
          description: `Detected ${count} instances of ${cat}. If transmitted or logged in plaintext, this creates exposure liabilities.`,
          affectedCategory: cat,
          severity: cat.includes('CARD') || cat.includes('SSN') || cat.includes('SECRET') ? 'critical' : 'medium',
        })),
        regulatoryImpacts: [
          {
            regulation: 'GDPR / CCPA',
            applicability: 'Applies to personal data (emails, names, phones).',
            safeguardRequirements: 'Enforce pseudonymization and storage limitation.',
          },
        ],
        recommendedStrategies: Object.keys(params.categoryCounts).map((cat) => ({
          category: cat,
          recommendedStrategy: cat.includes('SECRET') ? 'REDACT' : 'PARTIAL_MASK',
          rationale: 'Prevent accidental exposure while maintaining debugging utility where appropriate.',
        })),
        dataMinimizationNotice: 'Evaluated under deterministic privacy engine metadata.',
        disclaimer: fallbackDisclaimer,
      };
    }

    try {
      const prompt = `
You are an expert Data Privacy Engineer and Information Security Auditor for PrivyShield AI.
Evaluate the privacy risk profile and recommend masking strategies based strictly on the following detected entity metadata:

DETECTION METRICS:
- Total Sensitive Entities Detected: ${params.totalEntities}
- Document / Text Length: ${params.textLength} characters
- Input Format: ${params.inputType}
- Current Strategy Applied: ${params.currentStrategy}
- Category Breakdown: ${JSON.stringify(params.categoryCounts)}
${params.sampleSanitizedContext ? `- Sanitized Context Excerpt (Zero raw PII): "${params.sampleSanitizedContext}"` : ''}

Respond with valid JSON matching this schema:
{
  "riskScore": <number from 0 to 100>,
  "overallRiskLevel": "<low|medium|high|critical>",
  "executiveSummary": "<concise 2-3 sentence executive summary of exposure risk>",
  "identifiedRiskVectors": [
    {
      "title": "<risk vector name>",
      "description": "<detailed risk consequence, e.g. identity theft, credential stuffing, compliance breach>",
      "affectedCategory": "<entity category>",
      "severity": "<low|medium|high|critical>"
    }
  ],
  "regulatoryImpacts": [
    {
      "regulation": "<GDPR|HIPAA|PCI-DSS|CCPA>",
      "applicability": "<why and how this regulation applies to the detected data types>",
      "safeguardRequirements": "<specific technical safeguard required by article/section>"
    }
  ],
  "recommendedStrategies": [
    {
      "category": "<entity category>",
      "recommendedStrategy": "<REDACT|CATEGORY_TAG|PARTIAL_MASK|SYNTHETIC|CRYPTOGRAPHIC_HASH>",
      "rationale": "<why this strategy balances privacy and operational utility>"
    }
  ],
  "dataMinimizationNotice": "<brief note describing data minimization practiced during this scan>"
}
Do not wrap in markdown quotes if possible, output pure JSON. Do not make false guarantees of 100% legal compliance.
`;

      const response = await gemini.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          systemInstruction:
            'You are PrivyShield AI, a pragmatic cybersecurity privacy auditor. Provide rigorous, objective risk assessments. Never promise absolute legal immunity.',
        },
      });

      const responseText = response.text?.trim() || '{}';
      const parsed = JSON.parse(responseText);

      return {
        ...parsed,
        disclaimer: fallbackDisclaimer,
      };
    } catch (err: any) {
      console.error('[PrivyShield AI Gemini Service] Error generating risk assessment:', err);
      const cleanErr = parseGeminiErrorMessage(err.message || 'Transient error');
      return {
        riskScore: Math.min(params.totalEntities * 15, 90),
        overallRiskLevel: params.totalEntities > 3 ? 'high' : 'medium',
        executiveSummary: `Found ${params.totalEntities} sensitive entities. (AI service status: ${cleanErr}; automated deterministic heuristics applied).`,
        identifiedRiskVectors: Object.entries(params.categoryCounts).map(([cat, count]) => ({
          title: `Potential ${cat} Exposure`,
          description: `${count} instances identified. Consider strict masking prior to downstream distribution.`,
          affectedCategory: cat,
          severity: 'medium',
        })),
        regulatoryImpacts: [
          {
            regulation: 'General Privacy Mandates',
            applicability: 'Identified PII elements fall under standard data protection obligations.',
            safeguardRequirements: 'Apply deterministic redaction or pseudonymization.',
          },
        ],
        recommendedStrategies: Object.keys(params.categoryCounts).map((cat) => ({
          category: cat,
          recommendedStrategy: 'CATEGORY_TAG',
          rationale: 'Safe default for preventing data leakage.',
        })),
        dataMinimizationNotice: 'Processed via deterministic privacy engine.',
        disclaimer: fallbackDisclaimer,
      };
    }
  }

  /**
   * Interactive AI Privacy Assistant chat
   */
  public static async chatWithAssistant(
    userMessage: string,
    history: AssistantMessage[] = []
  ): Promise<string> {
    const gemini = getGeminiClient();
    const status = getGeminiStatus();

    if (!gemini || !status.available) {
      return (
        'The PrivyShield AI Privacy Assistant is currently offline because GEMINI_API_KEY is not configured in the server environment. ' +
        'You can configure your API key in the Secrets panel to activate full conversational privacy guidance, GDPR/HIPAA compliance Q&A, and masking architecture recommendations.'
      );
    }

    try {
      const contents = history.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      }));

      contents.push({
        role: 'user',
        parts: [{ text: userMessage }],
      });

      const systemInstruction = `
You are the PrivyShield AI Enterprise Privacy Assistant.
You specialize in data de-identification, anonymization vs. pseudonymization, privacy-enhancing technologies (PETs), prompt sanitization for LLMs, and international privacy standards (GDPR, HIPAA, CCPA/CPRA, PCI-DSS v4.0).
Your style:
- Highly professional, concise, actionable, and cybersecurity-focused.
- Emphasize defense-in-depth: never rely solely on an LLM to redact data; advocate deterministic backend tokenization and masking.
- Provide practical code or configuration snippets when asked.
- Explicitly remind users that automated masking tools provide technical safeguards but do not substitute for formal legal compliance counsel.
`;

      const response = await gemini.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      return (
        response.text ||
        'I have analyzed your query. Please let me know if you would like recommendations for specific data types or compliance policies.'
      );
    } catch (err: any) {
      console.error('[PrivyShield AI Assistant Error]', err);
      const cleanErr = parseGeminiErrorMessage(err.message || 'Unknown error');
      return `AI Assistant notice: ${cleanErr}`;
    }
  }
}
