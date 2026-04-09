import { Router } from 'express';
import {
  getAdminStats,
  listAdminUsers,
  notifyAdminUser,
  removeAdminUser,
  setUserBlockedStatus,
} from '../controllers/admin.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';
import { validateObjectId } from '../middleware/validate.middleware.js';

const router = Router();

router.use(authenticate, requireAdmin);
router.get('/admin/stats', getAdminStats);
router.get('/admin/users', listAdminUsers);
router.post('/admin/users/:id/notify', validateObjectId('id'), notifyAdminUser);
router.patch(
  '/admin/users/:id/block',
  validateObjectId('id'),
  setUserBlockedStatus,
);
router.delete('/admin/users/:id', validateObjectId('id'), removeAdminUser);

export default router;
