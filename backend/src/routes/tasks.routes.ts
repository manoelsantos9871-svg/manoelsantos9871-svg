import { Router } from 'express';
import { tasksController } from '../controllers/tasks.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/', tasksController.findAll);
router.get('/:id', tasksController.findById);
router.post('/', tasksController.create);
router.put('/:id', tasksController.update);
router.patch('/:id/status', tasksController.updateStatus);
router.post('/:id/time', tasksController.logTime);
router.post('/:id/comments', tasksController.addComment);

export default router;
