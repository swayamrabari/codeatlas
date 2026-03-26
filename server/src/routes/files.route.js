import { Router } from 'express';
import {
  getFilesPageFileList,
  getFilesPageFeatures,
  getFilesPageFeatureDetail,
} from '../controllers/files.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateObjectId } from '../middleware/validate.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/projects/:id/files', validateObjectId('id'), getFilesPageFileList);
router.get(
  '/projects/:id/files/features',
  validateObjectId('id'),
  getFilesPageFeatures,
);
router.get(
  '/projects/:id/files/features/:keyword',
  validateObjectId('id'),
  getFilesPageFeatureDetail,
);

export default router;
