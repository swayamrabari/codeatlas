const express = require('express');
const router = express.Router();
const protect = require('../middleware/protect');
const {
  getBudgets,
  getBudget,
  createBudget,
  updateBudget,
  deleteBudget,
} = require('../controllers/budgetsController');

// All routes require authentication
router.use(protect);

router.get('/', getBudgets);
router.get('/:budgetId', getBudget);
router.post('/', createBudget);
router.put('/:budgetId', updateBudget);
router.delete('/:budgetId', deleteBudget);

module.exports = router;

