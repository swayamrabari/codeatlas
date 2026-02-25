const Entry = require('../models/Entries');
const logger = require('../utils/logger');

// Get all entries for the authenticated user
exports.getEntries = async (req, res) => {
  try {
    const entries = await Entry.find({ userId: req.user._id })
      .sort({ date: -1, createdAt: -1 });
    
    res.status(200).json(entries);
  } catch (error) {
    logger.error('Error fetching entries', { error: error.message, stack: error.stack, userId: req.user?._id });
    res.status(500).json({ message: 'Server error' });
  }
};

// Get a specific entry
exports.getEntry = async (req, res) => {
  try {
    const { entryId } = req.params;
    const entry = await Entry.findOne({
      _id: entryId,
      userId: req.user._id,
    });

    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    res.status(200).json(entry);
  } catch (error) {
    logger.error('Error fetching entry', { error: error.message, stack: error.stack, entryId: req.params.entryId, userId: req.user?._id });
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new entry
exports.createEntry = async (req, res) => {
  try {
    const { type, amount, category, date, description } = req.body;

    if (!type || !amount || !category) {
      return res.status(400).json({ 
        message: 'Type, amount, and category are required' 
      });
    }

    if (!['income', 'expense', 'investment', 'savings'].includes(type)) {
      return res.status(400).json({ message: 'Invalid entry type' });
    }

    const newEntry = await Entry.create({
      userId: req.user._id,
      type,
      amount,
      category,
      date: date ? new Date(date) : new Date(),
      description,
    });

    res.status(201).json(newEntry);
  } catch (error) {
    logger.error('Error creating entry', { error: error.message, stack: error.stack, userId: req.user?._id });
    res.status(500).json({ message: 'Server error' });
  }
};

// Update an entry
exports.updateEntry = async (req, res) => {
  try {
    const { entryId } = req.params;
    const { type, amount, category, date, description } = req.body;

    const entry = await Entry.findOne({
      _id: entryId,
      userId: req.user._id,
    });

    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    if (type && !['income', 'expense', 'investment', 'savings'].includes(type)) {
      return res.status(400).json({ message: 'Invalid entry type' });
    }

    if (type) entry.type = type;
    if (amount !== undefined) entry.amount = amount;
    if (category) entry.category = category;
    if (date) entry.date = new Date(date);
    if (description !== undefined) entry.description = description;

    await entry.save();
    res.status(200).json(entry);
  } catch (error) {
    logger.error('Error updating entry', { error: error.message, stack: error.stack, entryId: req.params.entryId, userId: req.user?._id });
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete an entry
exports.deleteEntry = async (req, res) => {
  try {
    const { entryId } = req.params;
    
    const entry = await Entry.findOne({
      _id: entryId,
      userId: req.user._id,
    });

    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    await Entry.deleteOne({ _id: entryId });
    res.status(200).json({ message: 'Entry deleted' });
  } catch (error) {
    logger.error('Error deleting entry', { error: error.message, stack: error.stack, entryId: req.params.entryId, userId: req.user?._id });
    res.status(500).json({ message: 'Server error' });
  }
};

