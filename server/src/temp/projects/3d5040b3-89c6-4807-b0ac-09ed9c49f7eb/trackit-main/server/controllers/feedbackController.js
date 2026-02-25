const Feedback = require('../models/Feedback');
const logger = require('../utils/logger');

// Create feedback
exports.createFeedback = async (req, res) => {
  try {
    const { type, priority, message } = req.body;
    const userId = req.user._id;

    if (!type || !message) {
      return res.status(400).json({ message: 'Type and message are required' });
    }

    if (!['issue', 'review', 'feature-request', 'bug-report', 'feedback'].includes(type)) {
      return res.status(400).json({ message: 'Invalid feedback type' });
    }

    if (priority && !['low', 'medium', 'high', 'critical'].includes(priority)) {
      return res.status(400).json({ message: 'Invalid priority' });
    }

    const feedback = await Feedback.create({
      userId,
      type,
      priority: priority || 'medium',
      message,
    });

    logger.info('Feedback created', { feedbackId: feedback._id, userId, type });

    res.status(201).json({
      feedback: {
        _id: feedback._id,
        type: feedback.type,
        priority: feedback.priority,
        message: feedback.message,
        status: feedback.status,
        createdAt: feedback.createdAt,
      },
    });
  } catch (error) {
    logger.error('Error creating feedback', { error: error.message });
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's own feedback
exports.getUserFeedback = async (req, res) => {
  try {
    const userId = req.user._id;
    const feedback = await Feedback.find({ userId }).sort({ createdAt: -1 });

    res.status(200).json({ feedback });
  } catch (error) {
    logger.error('Error fetching user feedback', { error: error.message });
    res.status(500).json({ message: 'Server error' });
  }
};

