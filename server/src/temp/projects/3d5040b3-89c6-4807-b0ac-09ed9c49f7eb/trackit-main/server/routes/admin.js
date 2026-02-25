const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const admin = require('../middleware/admin');

router.get('/stats', admin, adminController.getDashboardStats);
router.get('/users', admin, adminController.getAllUsers);
router.get('/feedback', admin, adminController.getAllFeedback);
router.put('/feedback/:feedbackId/status', admin, adminController.updateFeedbackStatus);

module.exports = router;

