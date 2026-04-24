import { Router } from 'express';
import { usersController } from '../controllers/users.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

const router = Router();

router.use(authenticate);
router.get('/', authorize('MANAGER', 'ADMIN'), usersController.findAll);
router.get('/stats', authorize('MANAGER', 'ADMIN'), usersController.getStats);
router.get('/:id', usersController.findById);
router.post('/', authorize('ADMIN'), usersController.create);
router.put('/:id', authorize('ADMIN'), usersController.update);
router.patch('/:id/status', authorize('ADMIN'), usersController.updateStatus);
router.post('/:id/reset-password', authorize('ADMIN'), usersController.resetPassword);

export default router;
