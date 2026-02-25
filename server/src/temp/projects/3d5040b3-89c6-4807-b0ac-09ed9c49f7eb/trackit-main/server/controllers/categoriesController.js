const User = require('../models/User');
const logger = require('../utils/logger');

// Get user's custom categories
exports.getCategories = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(
      user.categories || {
        income: [],
        expense: [],
        investment: [],
        savings: [],
      }
    );
  } catch (error) {
    logger.error('Error fetching categories', {
      error: error.message,
      stack: error.stack,
      userId: req.user?._id,
    });
    res.status(500).json({ message: 'Server error' });
  }
};

// Add a category to a specific type
exports.addCategory = async (req, res) => {
  try {
    const { categoryType, category } = req.body;

    if (!categoryType || !category) {
      return res.status(400).json({
        message: 'Category type and category name are required',
      });
    }

    if (
      !['income', 'expense', 'investment', 'savings'].includes(categoryType)
    ) {
      return res.status(400).json({ message: 'Invalid category type' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize categories if they don't exist
    if (!user.categories) {
      user.categories = {
        income: [],
        expense: [],
        investment: [],
        savings: [],
      };
    }

    // Check if category already exists
    if (user.categories[categoryType].includes(category)) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    // Add the category
    user.categories[categoryType].push(category);
    await user.save();

    res.status(200).json(user.categories);
  } catch (error) {
    logger.error('Error adding category', {
      error: error.message,
      stack: error.stack,
      userId: req.user?._id,
      categoryType: req.body.categoryType,
    });
    res.status(500).json({ message: 'Server error' });
  }
};

// Remove a category from a specific type
exports.removeCategory = async (req, res) => {
  try {
    const { categoryType, category } = req.body;

    if (!categoryType || !category) {
      return res.status(400).json({
        message: 'Category type and category name are required',
      });
    }

    if (
      !['income', 'expense', 'investment', 'savings'].includes(categoryType)
    ) {
      return res.status(400).json({ message: 'Invalid category type' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize categories if they don't exist
    if (!user.categories) {
      user.categories = {
        income: [],
        expense: [],
        investment: [],
        savings: [],
      };
    }

    // Remove the category
    user.categories[categoryType] = user.categories[categoryType].filter(
      (cat) => cat !== category
    );
    await user.save();

    res.status(200).json(user.categories);
  } catch (error) {
    logger.error('Error removing category', {
      error: error.message,
      stack: error.stack,
      userId: req.user?._id,
      categoryType: req.body.categoryType,
    });
    res.status(500).json({ message: 'Server error' });
  }
};

// Update all categories at once (useful for bulk updates)
exports.updateCategories = async (req, res) => {
  try {
    const { categories } = req.body;

    if (!categories) {
      return res.status(400).json({ message: 'Categories object is required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate and update categories
    const validTypes = ['income', 'expense', 'investment', 'savings'];
    for (const type of validTypes) {
      if (categories[type] && Array.isArray(categories[type])) {
        user.categories[type] = categories[type];
      }
    }

    await user.save();
    res.status(200).json(user.categories);
  } catch (error) {
    logger.error('Error updating categories', {
      error: error.message,
      stack: error.stack,
      userId: req.user?._id,
    });
    res.status(500).json({ message: 'Server error' });
  }
};
