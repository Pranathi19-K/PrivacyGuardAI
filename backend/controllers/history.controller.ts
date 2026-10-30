import { Request, Response } from 'express';
import { StorageService } from '../services/storage.service.ts';

export class HistoryController {
  public static async getAudits(req: Request, res: Response) {
    try {
      const search = req.query.search as string;
      const limit = parseInt(req.query.limit as string, 10) || 50;

      const audits = await StorageService.getScanAudits({ limit, search });
      return res.json({
        success: true,
        count: audits.length,
        audits,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getStats(req: Request, res: Response) {
    try {
      const stats = await StorageService.getScanStats();
      return res.json({
        success: true,
        stats,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async deleteAudit(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await StorageService.deleteScanAudit(id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Scan audit not found.' });
      }
      return res.json({ success: true, message: 'Scan audit removed from history.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}
