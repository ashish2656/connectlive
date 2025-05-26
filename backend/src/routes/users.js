const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Search users by username
router.get('/search', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({ message: 'Username query parameter is required' });
    }

    // Find users whose username matches the search query (case-insensitive)
    const users = await User.find({
      username: { $regex: username, $options: 'i' },
      _id: { $ne: req.user.userId } // Exclude the current user
    })
    .select('username email friendCode')
    .limit(10); // Limit results to 10 users

    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Error searching users', error: error.message });
  }
});

module.exports = router; 