import { Router } from 'express';
import { serviceOrdersController } from '../controllers/serviceOrders.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/', serviceOrdersController.findAll);
router.get('/:id', serviceOrdersController.findById);
router.post('/', serviceOrdersController.create);
router.put('/:id', serviceOrdersController.update);
router.patch('/:id/status', serviceOrdersController.updateStatus);
router.patch('/:id/checklists/:checklistId', serviceOrdersController.updateChecklist);

export default router;
