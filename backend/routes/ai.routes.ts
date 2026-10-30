import { Router } from 'express';
import { AiController } from '../controllers/ai.controller.ts';
import { authenticateToken } from '../middleware/auth.middleware.ts';

const router = Router();

router.post('/evaluate-risk', authenticateToken, AiController.evaluateRisk);
router.post('/assistant/chat', authenticateToken, AiController.chatAssistant);
router.get('/status', authenticateToken, AiController.getStatus);

export default router;
