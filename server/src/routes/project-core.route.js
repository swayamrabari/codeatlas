import { Router } from 'express';
import {
  listProjects,
  getProjectStatus,
  cancelProjectUpload,
  deleteProject,
  getShareSuggestions,
  getProjectShareSettings,
  updateProjectShares,
} from '../controllers/projects.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateObjectId } from '../middleware/validate.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/projects', listProjects);
router.get('/projects/share/suggestions', getShareSuggestions);
router.get('/projects/:id/status', validateObjectId('id'), getProjectStatus);
router.post(
  '/projects/:id/cancel',
  validateObjectId('id'),
  cancelProjectUpload,
);
router.get(
  '/projects/:id/share',
  validateObjectId('id'),
  getProjectShareSettings,
);
router.patch(
  '/projects/:id/share',
  validateObjectId('id'),
  updateProjectShares,
);
router.delete('/projects/:id', validateObjectId('id'), deleteProject);

export default router;
