const Chat = require('../models/Chat');
const logger = require('../utils/logger');

// Get all chat sessions for the authenticated user
exports.getChatSessions = async (req, res) => {
  try {
    // Include messages so we can load all sessions at once
    const sessions = await Chat.find({ userId: req.user._id })
      .sort({ updatedAt: -1 });
    
    res.status(200).json(sessions);
  } catch (error) {
    logger.error('Error fetching chat sessions', { error: error.message, stack: error.stack, userId: req.user?._id });
    res.status(500).json({ message: 'Server error' });
  }
};

// Get a specific chat session with all messages
exports.getChatSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Chat.findOne({
      _id: sessionId,
      userId: req.user._id,
    });

    if (!session) {
      return res.status(404).json({ message: 'Chat session not found' });
    }

    res.status(200).json(session);
  } catch (error) {
    logger.error('Error fetching chat session', { error: error.message, stack: error.stack, sessionId: req.params.sessionId, userId: req.user?._id });
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new chat session
exports.createChatSession = async (req, res) => {
  try {
    const { title } = req.body;
    
    const newSession = await Chat.create({
      userId: req.user._id,
      title: title || 'New Chat',
      messages: [],
    });

    res.status(201).json(newSession);
  } catch (error) {
    logger.error('Error creating chat session', { error: error.message, stack: error.stack, userId: req.user?._id });
    res.status(500).json({ message: 'Server error' });
  }
};

// Update chat session (title, messages, etc.)
// Using atomic update to avoid version conflicts
exports.updateChatSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { title, messages } = req.body;

    const updateData = {};
    if (title !== undefined) {
      updateData.title = title;
    }
    if (messages !== undefined) {
      updateData.messages = messages;
    }

    // Atomic update - avoids version conflicts entirely
    // findOneAndUpdate performs the update atomically without version checking
    const session = await Chat.findOneAndUpdate(
      {
        _id: sessionId,
        userId: req.user._id, // Security check
      },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!session) {
      return res.status(404).json({ message: 'Chat session not found' });
    }

    res.status(200).json(session);
  } catch (error) {
    logger.error('Error updating chat session', { error: error.message, stack: error.stack, sessionId: req.params.sessionId, userId: req.user?._id });
    
    // Handle version errors gracefully (shouldn't happen with atomic update, but just in case)
    if (error.name === 'VersionError') {
      logger.warn('Version conflict detected, retrying with fresh document', { sessionId: req.params.sessionId });
      try {
        // Fallback: fetch fresh document and retry
        const session = await Chat.findOne({
          _id: sessionId,
          userId: req.user._id,
        });
        if (!session) {
          return res.status(404).json({ message: 'Chat session not found' });
        }
        if (title !== undefined) session.title = title;
        if (messages !== undefined) session.messages = messages;
        await session.save();
        return res.status(200).json(session);
      } catch (retryError) {
        logger.error('Retry failed', { error: retryError.message, sessionId: req.params.sessionId });
      }
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a chat session
exports.deleteChatSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await Chat.findOne({
      _id: sessionId,
      userId: req.user._id,
    });

    if (!session) {
      return res.status(404).json({ message: 'Chat session not found' });
    }

    await Chat.deleteOne({ _id: sessionId });
    res.status(200).json({ message: 'Chat session deleted' });
  } catch (error) {
    logger.error('Error deleting chat session', { error: error.message, stack: error.stack, sessionId: req.params.sessionId, userId: req.user?._id });
    res.status(500).json({ message: 'Server error' });
  }
};

