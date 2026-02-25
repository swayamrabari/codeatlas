const express = require('express');
const router = express.Router();
const protect = require('../middleware/protect');
const {
  getChatSessions,
  getChatSession,
  createChatSession,
  updateChatSession,
  deleteChatSession,
} = require('../controllers/chatController');

// All routes require authentication
router.use(protect);

router.get('/', getChatSessions);
router.get('/:sessionId', getChatSession);
router.post('/', createChatSession);
router.put('/:sessionId', updateChatSession);
router.delete('/:sessionId', deleteChatSession);

module.exports = router;

