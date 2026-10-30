import { Request, Response } from 'express';
import { GeminiPrivacyService } from '../services/gemini.service.ts';
import { getGeminiStatus } from '../config/gemini.ts';

export class AiController {
  public static async evaluateRisk(req: Request, res: Response) {
    try {
      const {
        categoryCounts = {},
        totalEntities = 0,
        textLength = 0,
        inputType = 'text',
        currentStrategy = 'CATEGORY_TAG',
        sampleSanitizedContext,
      } = req.body;

      const analysis = await GeminiPrivacyService.evaluatePrivacyRisks({
        categoryCounts,
        totalEntities,
        textLength,
        inputType,
        currentStrategy,
        sampleSanitizedContext,
      });

      return res.json({
        success: true,
        data: analysis,
      });
    } catch (err: any) {
      console.error('[AI Evaluate Risk Error]', err);
      return res.status(500).json({
        success: false,
        error: `AI risk evaluation failed: ${err.message}`,
      });
    }
  }

  public static async chatAssistant(req: Request, res: Response) {
    try {
      const { message, history = [] } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'User message is required.',
        });
      }

      const reply = await GeminiPrivacyService.chatWithAssistant(message, history);

      return res.json({
        success: true,
        reply,
      });
    } catch (err: any) {
      console.error('[AI Assistant Chat Error]', err);
      return res.status(500).json({
        success: false,
        error: `AI Assistant error: ${err.message}`,
      });
    }
  }

  public static getStatus(req: Request, res: Response) {
    const status = getGeminiStatus();
    return res.json({
      success: true,
      status,
    });
  }
}
