const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Get user's friends
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate('friends', 'username email friendCode profilePicture')
      .populate('friendRequests.sender', 'username email friendCode profilePicture');
    
    res.json({
      friends: user.friends,
      friendRequests: user.friendRequests
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching friends', error: error.message });
  }
});

// Send friend request using friend code
router.post('/request/:friendCode', async (req, res) => {
  try {
    const friend = await User.findOne({ friendCode: req.params.friendCode });
    
    if (!friend) {
      return res.status(404).json({ message: 'User not found with this friend code' });
    }

    if (friend._id.toString() === req.user.userId) {
      return res.status(400).json({ message: 'Cannot send friend request to yourself' });
    }

    // Check if already friends
    if (friend.friends.includes(req.user.userId)) {
      return res.status(400).json({ message: 'Already friends with this user' });
    }

    // Check if friend request already exists
    const existingRequest = friend.friendRequests.find(
      request => request.sender.toString() === req.user.userId
    );

    if (existingRequest) {
      return res.status(400).json({ message: 'Friend request already sent' });
    }

    friend.friendRequests.push({
      sender: req.user.userId,
      status: 'pending'
    });

    await friend.save();
    res.json({ message: 'Friend request sent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error sending friend request', error: error.message });
  }
});

// Accept friend request
router.post('/accept/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const friend = await User.findById(req.params.userId);

    if (!friend) {
      return res.status(404).json({ message: 'User not found' });
    }

    const requestIndex = user.friendRequests.findIndex(
      request => request.sender.toString() === req.params.userId
    );

    if (requestIndex === -1) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    // Update request status
    user.friendRequests[requestIndex].status = 'accepted';
    
    // Add to friends list for both users
    user.friends.push(friend._id);
    friend.friends.push(user._id);

    await Promise.all([user.save(), friend.save()]);
    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    res.status(500).json({ message: 'Error accepting friend request', error: error.message });
  }
});

// Reject friend request
router.post('/reject/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    const requestIndex = user.friendRequests.findIndex(
      request => request.sender.toString() === req.params.userId
    );

    if (requestIndex === -1) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    // Update request status
    user.friendRequests[requestIndex].status = 'rejected';
    await user.save();
    
    res.json({ message: 'Friend request rejected' });
  } catch (error) {
    res.status(500).json({ message: 'Error rejecting friend request', error: error.message });
  }
});

// Remove friend
router.delete('/:friendId', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const friend = await User.findById(req.params.friendId);

    if (!friend) {
      return res.status(404).json({ message: 'Friend not found' });
    }

    // Remove from both users' friends lists
    user.friends = user.friends.filter(id => id.toString() !== req.params.friendId);
    friend.friends = friend.friends.filter(id => id.toString() !== req.user.userId);

    await Promise.all([user.save(), friend.save()]);
    res.json({ message: 'Friend removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error removing friend', error: error.message });
  }
});

module.exports = router; 