const Budget = require('../models/Budgets');
const logger = require('../utils/logger');

// Get all budgets for the authenticated user
exports.getBudgets = async (req, res) => {
  try {
    const budgets = await Budget.find({ userId: req.user._id })
      .sort({ createdAt: -1 });
    
    res.status(200).json(budgets);
  } catch (error) {
    logger.error('Error fetching budgets', { error: error.message, stack: error.stack, userId: req.user?._id });
    res.status(500).json({ message: 'Server error' });
  }
};

// Get a specific budget
exports.getBudget = async (req, res) => {
  try {
    const { budgetId } = req.params;
    const budget = await Budget.findOne({
      _id: budgetId,
      userId: req.user._id,
    });

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    res.status(200).json(budget);
  } catch (error) {
    logger.error('Error fetching budget', { error: error.message, stack: error.stack, budgetId: req.params.budgetId, userId: req.user?._id });
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new budget
exports.createBudget = async (req, res) => {
  try {
    const { type, category, amount, period } = req.body;

    if (!type || !category || !amount || !period) {
      return res.status(400).json({ 
        message: 'Type, category, amount, and period are required' 
      });
    }

    if (!['expense', 'investment', 'savings'].includes(type)) {
      return res.status(400).json({ message: 'Invalid budget type' });
    }

    if (!['monthly', 'quarterly', 'half-yearly', 'yearly'].includes(period)) {
      return res.status(400).json({ message: 'Invalid budget period' });
    }

    const newBudget = await Budget.create({
      userId: req.user._id,
      type,
      category,
      amount,
      period,
    });

    res.status(201).json(newBudget);
  } catch (error) {
    logger.error('Error creating budget', { error: error.message, stack: error.stack, userId: req.user?._id });
    res.status(500).json({ message: 'Server error' });
  }
};

// Update a budget
exports.updateBudget = async (req, res) => {
  try {
    const { budgetId } = req.params;
    const { type, category, amount, period } = req.body;

    const budget = await Budget.findOne({
      _id: budgetId,
      userId: req.user._id,
    });

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    if (type && !['expense', 'investment', 'savings'].includes(type)) {
      return res.status(400).json({ message: 'Invalid budget type' });
    }

    if (period && !['monthly', 'quarterly', 'half-yearly', 'yearly'].includes(period)) {
      return res.status(400).json({ message: 'Invalid budget period' });
    }

    if (type) budget.type = type;
    if (category) budget.category = category;
    if (amount !== undefined) budget.amount = amount;
    if (period) budget.period = period;

    await budget.save();
    res.status(200).json(budget);
  } catch (error) {
    logger.error('Error updating budget', { error: error.message, stack: error.stack, budgetId: req.params.budgetId, userId: req.user?._id });
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a budget
exports.deleteBudget = async (req, res) => {
  try {
    const { budgetId } = req.params;
    
    const budget = await Budget.findOne({
      _id: budgetId,
      userId: req.user._id,
    });

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    await Budget.deleteOne({ _id: budgetId });
    res.status(200).json({ message: 'Budget deleted' });
  } catch (error) {
    logger.error('Error deleting budget', { error: error.message, stack: error.stack, budgetId: req.params.budgetId, userId: req.user?._id });
    res.status(500).json({ message: 'Server error' });
  }
};

