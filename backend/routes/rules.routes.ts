import { Router } from 'express';
import { RulesController } from '../controllers/rules.controller.ts';
import { authenticateToken } from '../middleware/auth.middleware.ts';
import { requireRoles } from '../middleware/rbac.middleware.ts';

const router = Router();

router.get('/', authenticateToken, RulesController.getRules);
router.patch('/:ruleId', authenticateToken, requireRoles(['admin', 'compliance_officer']), RulesController.updateRule);

export default router;
