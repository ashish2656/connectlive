const express = require('express');
const { generateToken } = require('../controllers/tokenController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Protected route - only authenticated users can get tokens
router.post('/get-token', protect, generateToken);

module.exports = router; 