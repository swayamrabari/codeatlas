const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { protect } = require('../middleware');

router.post('/', protect, feedbackController.createFeedback);
router.get('/', protect, feedbackController.getUserFeedback);

module.exports = router;

