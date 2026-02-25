const express = require('express');
const router = express.Router();
const protect = require('../middleware/protect');
const {
  getCategories,
  addCategory,
  removeCategory,
  updateCategories,
} = require('../controllers/categoriesController');

// All routes require authentication
router.use(protect);

router.get('/', getCategories);
router.post('/add', addCategory);
router.post('/remove', removeCategory);
router.put('/', updateCategories);

module.exports = router;

