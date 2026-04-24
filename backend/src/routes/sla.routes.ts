import { Router } from 'express';
import { slaController } from '../controllers/sla.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

const router = Router();

router.use(authenticate);
router.get('/', slaController.findAll);
router.get('/stats', slaController.getStats);
router.post('/', authorize('ADMIN', 'MANAGER'), slaController.upsert);
router.delete('/:id', authorize('ADMIN'), slaController.delete);

export default router;
