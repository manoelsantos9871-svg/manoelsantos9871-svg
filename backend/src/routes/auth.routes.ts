import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/login', authLimiter, authController.login);
router.post('/mfa/verify', authLimiter, authController.verifyMfa);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);
router.post('/mfa/setup', authenticate, authController.setupMfa);
router.post('/mfa/enable', authenticate, authController.enableMfa);
router.delete('/mfa', authenticate, authController.disableMfa);
router.put('/password', authenticate, authController.changePassword);

export default router;
