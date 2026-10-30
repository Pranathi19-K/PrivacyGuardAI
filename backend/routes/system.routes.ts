import { Router } from 'express';
import { SystemController } from '../controllers/system.controller.ts';
import { authenticateToken } from '../middleware/auth.middleware.ts';

const router = Router();

router.get('/status', SystemController.getStatus);
router.post('/database/reconnect', authenticateToken, SystemController.reconnectDatabase);
router.get('/docs', SystemController.getApiDocs);

export default router;
