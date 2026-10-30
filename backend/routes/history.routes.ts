import { Router } from 'express';
import { HistoryController } from '../controllers/history.controller.ts';
import { authenticateToken } from '../middleware/auth.middleware.ts';
import { requireRoles } from '../middleware/rbac.middleware.ts';

const router = Router();

router.get('/audits', authenticateToken, HistoryController.getAudits);
router.get('/stats', authenticateToken, HistoryController.getStats);
router.delete('/audits/:id', authenticateToken, requireRoles(['admin', 'compliance_officer']), HistoryController.deleteAudit);

export default router;
