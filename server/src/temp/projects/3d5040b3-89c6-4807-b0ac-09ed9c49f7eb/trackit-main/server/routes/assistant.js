const express = require('express');
const { getAssistantResponse, getFunctionCatalog } = require('../controllers/assistantController');

const router = express.Router();

router.post('/', getAssistantResponse);
router.get('/functions', getFunctionCatalog);

module.exports = router;
