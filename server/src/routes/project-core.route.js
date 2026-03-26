import { Router } from 'express';
import {
  listProjects,
  getProjectStatus,
  deleteProject,
} from '../controllers/projects.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateObjectId } from '../middleware/validate.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/projects', listProjects);
router.get('/projects/:id/status', validateObjectId('id'), getProjectStatus);
router.delete('/projects/:id', validateObjectId('id'), deleteProject);

export default router;
