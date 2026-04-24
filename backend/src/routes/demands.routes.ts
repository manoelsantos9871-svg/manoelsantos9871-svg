import { Router } from 'express';
import { demandsController } from '../controllers/demands.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/', demandsController.findAll);
router.get('/:id', demandsController.findById);
router.post('/', demandsController.create);
router.put('/:id', demandsController.update);
router.patch('/:id/status', demandsController.updateStatus);
router.post('/:id/comments', demandsController.addComment);

export default router;
