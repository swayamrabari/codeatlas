import { Router } from 'express';
import {
  getOverviewPageData,
  streamOverviewProgress,
  regenerateOverviewDoc,
  regenerateOverviewFeatureDoc,
  regenerateOverviewFileDoc,
} from '../controllers/overview.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateObjectId } from '../middleware/validate.middleware.js';

const router = Router();

router.use(authenticate);

router.get(
  '/projects/:id/overview',
  validateObjectId('id'),
  getOverviewPageData,
);
router.get(
  '/projects/:id/overview/progress',
  validateObjectId('id'),
  streamOverviewProgress,
);
router.post(
  '/projects/:id/overview/regenerate',
  validateObjectId('id'),
  regenerateOverviewDoc,
);
router.post(
  '/projects/:id/overview/regenerate/feature',
  validateObjectId('id'),
  regenerateOverviewFeatureDoc,
);
router.post(
  '/projects/:id/overview/regenerate/file',
  validateObjectId('id'),
  regenerateOverviewFileDoc,
);

export default router;
