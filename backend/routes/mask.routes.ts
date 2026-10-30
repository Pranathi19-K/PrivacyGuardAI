import { Router } from 'express';
import { MaskController } from '../controllers/mask.controller.ts';
import { authenticateToken } from '../middleware/auth.middleware.ts';
import { uploadDocument } from '../middleware/upload.middleware.ts';

const router = Router();

router.post('/text', authenticateToken, MaskController.maskText);
router.post('/document', authenticateToken, uploadDocument.single('document'), MaskController.maskDocument);
router.get('/catalog', MaskController.getCatalog);

export default router;
