const express = require('express');
const router = express.Router();
const protect = require('../middleware/protect');
const {
  getEntries,
  getEntry,
  createEntry,
  updateEntry,
  deleteEntry,
} = require('../controllers/entriesController');

// All routes require authentication
router.use(protect);

router.get('/', getEntries);
router.get('/:entryId', getEntry);
router.post('/', createEntry);
router.put('/:entryId', updateEntry);
router.delete('/:entryId', deleteEntry);

module.exports = router;

