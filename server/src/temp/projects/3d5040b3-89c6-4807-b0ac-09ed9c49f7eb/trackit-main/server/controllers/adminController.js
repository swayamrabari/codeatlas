const User = require('../models/User');
const Entry = require('../models/Entries');
const Budget = require('../models/Budgets');
const Chat = require('../models/Chat');
const Feedback = require('../models/Feedback');
const logger = require('../utils/logger');

// Get dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    const [totalUsers, totalEntries, totalBudgets, totalChats] = await Promise.all([
      User.countDocuments(),
      Entry.countDocuments(),
      Budget.countDocuments(),
      Chat.countDocuments(),
    ]);

    res.status(200).json({
      stats: {
        totalUsers,
        totalEntries,
        totalBudgets,
        totalChats,
      },
    });
  } catch (error) {
    logger.error('Error fetching dashboard stats', { error: error.message });
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all users with their counts
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });

    // Get counts for each user
    const usersWithCounts = await Promise.all(
      users.map(async (user) => {
        const [entriesCount, budgetsCount, chatsCount] = await Promise.all([
          Entry.countDocuments({ userId: user._id }),
          Budget.countDocuments({ userId: user._id }),
          Chat.countDocuments({ userId: user._id }),
        ]);

        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role || 'user',
          createdAt: user.createdAt,
          counts: {
            entries: entriesCount,
            budgets: budgetsCount,
            chats: chatsCount,
          },
        };
      })
    );

    res.status(200).json({ users: usersWithCounts });
  } catch (error) {
    logger.error('Error fetching users', { error: error.message });
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all feedback
exports.getAllFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ feedback });
  } catch (error) {
    logger.error('Error fetching feedback', { error: error.message });
    res.status(500).json({ message: 'Server error' });
  }
};

// Update feedback status
exports.updateFeedbackStatus = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { status } = req.body;

    if (!['new', 'read', 'resolved'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const feedback = await Feedback.findByIdAndUpdate(
      feedbackId,
      { status },
      { new: true }
    ).populate('userId', 'name email');

    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    res.status(200).json({ feedback });
  } catch (error) {
    logger.error('Error updating feedback status', { error: error.message });
    res.status(500).json({ message: 'Server error' });
  }
};

