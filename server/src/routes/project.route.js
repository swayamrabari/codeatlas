import express from 'express';
import {
  listProjects,
  getProject,
  getFileContent,
  getFileList,
  getFeatures,
  getFeatureDetail,
  deleteProject,
} from '../controllers/project.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// All project routes require authentication
router.use(authenticate);

// Project listing & CRUD
router.get('/projects', listProjects);
router.get('/project/:id', getProject);
router.delete('/project/:id', deleteProject);

// File endpoints (lazy loading)
router.get('/project/:id/files', getFileList);
router.get('/project/:id/file', getFileContent);

// Feature endpoints
router.get('/project/:id/features', getFeatures);
router.get('/project/:id/features/:keyword', getFeatureDetail);

export default router;
