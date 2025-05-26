const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Room = require('../models/Room');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');

// Validation middleware
const roomValidation = [
  body('name').trim().isLength({ min: 3 }).escape(),
  body('isPrivate').isBoolean().optional(),
  body('password').optional(),
  body('settings').optional().isObject()
];

// Create a new room
router.post('/', roomValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, isPrivate, password, settings } = req.body;
    const roomId = uuidv4();

    const room = new Room({
      name,
      roomId,
      host: req.user.userId,
      isPrivate: isPrivate || false,
      password: password || null,
      settings: settings || {},
      participants: [req.user.userId]
    });

    await room.save();

    res.status(201).json({
      message: 'Room created successfully',
      room: {
        id: room._id,
        name: room.name,
        roomId: room.roomId,
        isPrivate: room.isPrivate,
        settings: room.settings
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating room', error: error.message });
  }
});

// Get all rooms (public rooms only if not admin)
router.get('/', async (req, res) => {
  try {
    const rooms = await Room.find({ isPrivate: false })
      .populate('host', 'username email')
      .select('-password');
    
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching rooms', error: error.message });
  }
});

// Get specific room
router.get('/:roomId', async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId })
      .populate('host', 'username email')
      .populate('participants', 'username email')
      .select('-password');

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.json(room);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching room', error: error.message });
  }
});

// Join room
router.post('/:roomId/join', async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room.isPrivate && room.password !== req.body.password) {
      return res.status(401).json({ message: 'Invalid room password' });
    }

    if (room.participants.includes(req.user.userId)) {
      return res.status(400).json({ message: 'Already in room' });
    }

    if (room.participants.length >= room.settings.maxParticipants) {
      return res.status(400).json({ message: 'Room is full' });
    }

    room.participants.push(req.user.userId);
    await room.save();

    res.json({ message: 'Joined room successfully', roomId: room.roomId });
  } catch (error) {
    res.status(500).json({ message: 'Error joining room', error: error.message });
  }
});

// Leave room
router.post('/:roomId/leave', async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    room.participants = room.participants.filter(
      participant => participant.toString() !== req.user.userId
    );

    // If host leaves, assign new host or delete room
    if (room.host.toString() === req.user.userId) {
      if (room.participants.length > 0) {
        room.host = room.participants[0];
      } else {
        await Room.deleteOne({ _id: room._id });
        return res.json({ message: 'Room deleted successfully' });
      }
    }

    await room.save();
    res.json({ message: 'Left room successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error leaving room', error: error.message });
  }
});

// Update room settings (host only)
router.put('/:roomId/settings', roomValidation, async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room.host.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Only host can update settings' });
    }

    const { name, isPrivate, password, settings } = req.body;

    if (name) room.name = name;
    if (typeof isPrivate !== 'undefined') room.isPrivate = isPrivate;
    if (password) room.password = password;
    if (settings) room.settings = { ...room.settings, ...settings };

    await room.save();

    res.json({
      message: 'Room settings updated successfully',
      room: {
        id: room._id,
        name: room.name,
        roomId: room.roomId,
        isPrivate: room.isPrivate,
        settings: room.settings
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating room settings', error: error.message });
  }
});

// Invite user to room (host only)
router.post('/:roomId/invite', async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room.host.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Only host can invite users' });
    }

    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Check if user exists
    const invitedUser = await User.findById(userId);
    if (!invitedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is already in the room
    if (room.participants.includes(userId)) {
      return res.status(400).json({ message: 'User is already in the room' });
    }

    // Add user to participants
    room.participants.push(userId);
    await room.save();

    // You could also emit a socket event here to notify the invited user

    res.json({ message: 'User invited successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error inviting user', error: error.message });
  }
});

module.exports = router; 