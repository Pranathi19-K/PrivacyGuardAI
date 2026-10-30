import { Request, Response } from 'express';
import { StorageService } from '../services/storage.service.ts';

export class RulesController {
  public static async getRules(req: Request, res: Response) {
    try {
      const rules = await StorageService.getRules();
      return res.json({
        success: true,
        rules,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async updateRule(req: Request, res: Response) {
    try {
      const { ruleId } = req.params;
      const { defaultStrategy, isEnabled, customReplacement } = req.body;

      const updated = await StorageService.updateRule(ruleId, {
        defaultStrategy,
        isEnabled,
        customReplacement,
      });

      if (!updated) {
        return res.status(404).json({ success: false, error: 'Rule not found.' });
      }

      return res.json({
        success: true,
        message: 'Rule policy updated successfully.',
        rule: updated,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}
