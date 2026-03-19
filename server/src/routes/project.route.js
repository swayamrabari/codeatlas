import express from 'express';
import {
  listProjects,
  getProject,
  getProjectStatus,
  getProjectDocs,
  getFileContent,
  getFileList,
  getFeatures,
  getFeatureDetail,
  deleteProject,
  streamProgress,
  askProjectQuestion,
  regenerateFileDocs,
  regenerateFeatureDocs,
  regenerateProjectDocs,
} from '../controllers/project.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// All project routes require authentication
router.use(authenticate);

// Project listing & CRUD
router.get('/projects', listProjects);
router.get('/project/:id', getProject);
router.get('/project/:id/status', getProjectStatus);
router.get('/project/:id/progress', streamProgress); // SSE real-time progress
router.get('/project/:id/docs', getProjectDocs);
router.post('/project/:id/ask', askProjectQuestion);
router.delete('/project/:id', deleteProject);

// File endpoints (lazy loading)
router.get('/project/:id/files', getFileList);
router.get('/project/:id/file', getFileContent);

// Feature endpoints
router.get('/project/:id/features', getFeatures);
router.get('/project/:id/features/:keyword', getFeatureDetail);

// Selective doc regeneration
router.post('/project/:id/regenerate/file', regenerateFileDocs);
router.post('/project/:id/regenerate/feature', regenerateFeatureDocs);
router.post('/project/:id/regenerate/project', regenerateProjectDocs);

export default router;
