import express from 'express';
import {
  listProjects,
  getProject,
  getProjectStatus,
  deleteProject,
} from '../controllers/project.controller.js';
import {
  listProjectChats,
  getProjectChat,
  renameProjectChat,
  deleteProjectChat,
  askProjectQuestion,
  askProjectQuestionStream,
} from '../controllers/chat.controller.js';
import {
  getProjectDocs,
  streamProgress,
  regenerateFileDocs,
  regenerateFeatureDocs,
  regenerateProjectDocs,
} from '../controllers/docs.controller.js';
import {
  getFileList,
  getFileContent,
  getFeatures,
  getFeatureDetail,
} from '../controllers/explorer.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateObjectId } from '../middleware/validate.middleware.js';

const router = express.Router();

// All project routes require authentication
router.use(authenticate);

// Project listing & CRUD
router.get('/projects', listProjects);
router.get('/project/:id', validateObjectId('id'), getProject);
router.get('/project/:id/status', validateObjectId('id'), getProjectStatus);
router.delete('/project/:id', validateObjectId('id'), deleteProject);

// Chat endpoints
router.post('/project/:id/ask', validateObjectId('id'), askProjectQuestion);
router.post(
  '/project/:id/ask/stream',
  validateObjectId('id'),
  askProjectQuestionStream,
);
router.get('/project/:id/chats', validateObjectId('id'), listProjectChats);
router.get(
  '/project/:id/chats/:chatId',
  validateObjectId('id'),
  validateObjectId('chatId'),
  getProjectChat,
);
router.patch(
  '/project/:id/chats/:chatId',
  validateObjectId('id'),
  validateObjectId('chatId'),
  renameProjectChat,
);
router.delete(
  '/project/:id/chats/:chatId',
  validateObjectId('id'),
  validateObjectId('chatId'),
  deleteProjectChat,
);

// Documentation & progress
router.get('/project/:id/docs', validateObjectId('id'), getProjectDocs);
router.get('/project/:id/progress', validateObjectId('id'), streamProgress); // SSE real-time progress

// Explorer endpoints (lazy loading)
router.get('/project/:id/files', validateObjectId('id'), getFileList);
router.get('/project/:id/file', validateObjectId('id'), getFileContent);
router.get('/project/:id/features', validateObjectId('id'), getFeatures);
router.get(
  '/project/:id/features/:keyword',
  validateObjectId('id'),
  getFeatureDetail,
);

// Selective doc regeneration
router.post(
  '/project/:id/regenerate/file',
  validateObjectId('id'),
  regenerateFileDocs,
);
router.post(
  '/project/:id/regenerate/feature',
  validateObjectId('id'),
  regenerateFeatureDocs,
);
router.post(
  '/project/:id/regenerate/project',
  validateObjectId('id'),
  regenerateProjectDocs,
);

export default router;
