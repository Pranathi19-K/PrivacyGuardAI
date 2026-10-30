import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.ts';
import { authenticateToken } from '../middleware/auth.middleware.ts';
import { requireRoles } from '../middleware/rbac.middleware.ts';

const router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.get('/me', authenticateToken, AuthController.getProfile);
router.get('/team', authenticateToken, requireRoles(['admin', 'compliance_officer']), AuthController.listTeam);

export default router;
