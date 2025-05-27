const Meeting = require('../models/meetingModel');
const User = require('../models/userModel');

// Join meeting
const joinMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user._id;

    let meeting = await Meeting.findOne({ meetingId });

    // Create meeting if it doesn't exist
    if (!meeting) {
      meeting = await Meeting.create({
        meetingId,
        participants: [],
        isActive: true
      });
    }

    // Check if user is already in the meeting
    const existingParticipant = meeting.participants.find(
      p => p.userId.toString() === userId.toString()
    );

    if (existingParticipant) {
      // Update existing participant
      existingParticipant.isActive = true;
      existingParticipant.joinedAt = new Date();
    } else {
      // Add new participant
      meeting.participants.push({
        userId,
        username: req.user.username,
        isActive: true
      });
    }

    meeting.lastActivity = new Date();
    await meeting.save();

    res.status(200).json({
      success: true,
      participants: meeting.participants.filter(p => p.isActive)
    });
  } catch (error) {
    console.error('Error joining meeting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join meeting'
    });
  }
};

// Leave meeting
const leaveMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user._id;

    const meeting = await Meeting.findOne({ meetingId });
    
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Mark participant as inactive
    const participant = meeting.participants.find(
      p => p.userId.toString() === userId.toString()
    );

    if (participant) {
      participant.isActive = false;
    }

    meeting.lastActivity = new Date();
    await meeting.save();

    // Check if all participants are inactive
    const activeParticipants = meeting.participants.filter(p => p.isActive);
    if (activeParticipants.length === 0) {
      meeting.isActive = false;
      await meeting.save();
    }

    res.status(200).json({
      success: true,
      message: 'Successfully left meeting'
    });
  } catch (error) {
    console.error('Error leaving meeting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to leave meeting'
    });
  }
};

// Get meeting participants
const getMeetingParticipants = async (req, res) => {
  try {
    const { meetingId } = req.params;

    const meeting = await Meeting.findOne({ meetingId })
      .populate('participants.userId', 'username avatar');

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Update last activity
    meeting.lastActivity = new Date();
    await meeting.save();

    res.status(200).json({
      success: true,
      participants: meeting.participants.filter(p => p.isActive)
    });
  } catch (error) {
    console.error('Error getting meeting participants:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get meeting participants'
    });
  }
};

module.exports = {
  joinMeeting,
  leaveMeeting,
  getMeetingParticipants
}; 