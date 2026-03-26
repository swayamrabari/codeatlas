import { Router } from 'express';
import { getInsightsPageData } from '../controllers/insights.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateObjectId } from '../middleware/validate.middleware.js';

const router = Router();

router.use(authenticate);

router.get(
  '/projects/:id/insights',
  validateObjectId('id'),
  getInsightsPageData,
);

export default router;
