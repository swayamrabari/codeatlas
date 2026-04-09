import express from 'express';
import {
  handleZipUpload,
  handleGitUpload,
} from '../controllers/upload.controller.js';
import {
  authenticate,
  requireNonAdmin,
} from '../middleware/auth.middleware.js';
import { authRateLimiter } from '../middleware/rateLimit.middleware.js';
import { uploadProjectZip } from '../middleware/upload.middleware.js';

const router = express.Router();

router.post(
  '/upload',
  authenticate,
  requireNonAdmin,
  authRateLimiter,
  uploadProjectZip,
  handleZipUpload,
);
router.post(
  '/upload-git',
  authenticate,
  requireNonAdmin,
  authRateLimiter,
  handleGitUpload,
);

export default router;
