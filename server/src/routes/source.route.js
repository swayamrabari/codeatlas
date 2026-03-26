import { Router } from 'express';
import {
  getSourceFileList,
  getSourceFileContent,
} from '../controllers/files.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateObjectId } from '../middleware/validate.middleware.js';

const router = Router();

router.use(authenticate);

router.get(
  '/projects/:id/source/files',
  validateObjectId('id'),
  getSourceFileList,
);
router.get(
  '/projects/:id/source/file',
  validateObjectId('id'),
  getSourceFileContent,
);

export default router;
