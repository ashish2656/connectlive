const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  joinMeeting,
  leaveMeeting,
  getMeetingParticipants
} = require('../controllers/meetingController');

const router = express.Router();

// Protected routes
router.post('/:meetingId/join', protect, joinMeeting);
router.post('/:meetingId/leave', protect, leaveMeeting);
router.get('/:meetingId/participants', protect, getMeetingParticipants);

module.exports = router; 