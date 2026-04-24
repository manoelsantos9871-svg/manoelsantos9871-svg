import { Router } from 'express';
import authRoutes from './auth.routes';
import usersRoutes from './users.routes';
import demandsRoutes from './demands.routes';
import tasksRoutes from './tasks.routes';
import serviceOrdersRoutes from './serviceOrders.routes';
import slaRoutes from './sla.routes';
import dashboardRoutes from './dashboard.routes';
import auditRoutes from './audit.routes';
import catalogRoutes from './catalog.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/demands', demandsRoutes);
router.use('/tasks', tasksRoutes);
router.use('/service-orders', serviceOrdersRoutes);
router.use('/sla', slaRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/audit', auditRoutes);
router.use('/catalog', catalogRoutes);

export default router;
