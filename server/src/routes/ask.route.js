import { Router } from 'express';
import {
  listAskChats,
  getAskChat,
  renameAskChat,
  deleteAskChat,
  askQuestion,
  streamAskQuestion,
} from '../controllers/ask.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateObjectId } from '../middleware/validate.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/projects/:id/ask', validateObjectId('id'), askQuestion);
router.post(
  '/projects/:id/ask/stream',
  validateObjectId('id'),
  streamAskQuestion,
);
router.get('/projects/:id/ask/chats', validateObjectId('id'), listAskChats);
router.get(
  '/projects/:id/ask/chats/:chatId',
  validateObjectId('id'),
  validateObjectId('chatId'),
  getAskChat,
);
router.patch(
  '/projects/:id/ask/chats/:chatId',
  validateObjectId('id'),
  validateObjectId('chatId'),
  renameAskChat,
);
router.delete(
  '/projects/:id/ask/chats/:chatId',
  validateObjectId('id'),
  validateObjectId('chatId'),
  deleteAskChat,
);

export default router;
