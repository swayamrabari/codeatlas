import { Router } from 'express';
import { validateObjectId } from '../middleware/validate.middleware.js';
import {
  getPublicProjectStatus,
  getPublicOverviewPageData,
  getPublicInsightsPageData,
  getPublicFilesPageFileList,
  getPublicSourceFileList,
  getPublicSourceFileContent,
} from '../controllers/public.controller.js';

const router = Router();

router.get(
  '/public/projects/:id/status',
  validateObjectId('id'),
  getPublicProjectStatus,
);
router.get(
  '/public/projects/:id/overview',
  validateObjectId('id'),
  getPublicOverviewPageData,
);
router.get(
  '/public/projects/:id/insights',
  validateObjectId('id'),
  getPublicInsightsPageData,
);
router.get(
  '/public/projects/:id/files',
  validateObjectId('id'),
  getPublicFilesPageFileList,
);
router.get(
  '/public/projects/:id/source/files',
  validateObjectId('id'),
  getPublicSourceFileList,
);
router.get(
  '/public/projects/:id/source/file',
  validateObjectId('id'),
  getPublicSourceFileContent,
);

export default router;
