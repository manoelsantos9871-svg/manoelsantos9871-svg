import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/overview', dashboardController.getOverview);
router.get('/demands-by-status', dashboardController.getDemandsByStatus);
router.get('/demands-by-type', dashboardController.getDemandsByType);
router.get('/demands-by-priority', dashboardController.getDemandsByPriority);
router.get('/volume', dashboardController.getVolumeByPeriod);
router.get('/top-technicians', dashboardController.getTopTechnicians);
router.get('/avg-resolution-time', dashboardController.getAvgResolutionTime);

export default router;
