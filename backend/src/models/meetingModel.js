const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

const meetingSchema = new mongoose.Schema({
  meetingId: {
    type: String,
    required: true,
    unique: true
  },
  participants: [participantSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

// Add index for automatic cleanup of inactive meetings
meetingSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 3600 }); // Expire after 1 hour of inactivity

module.exports = mongoose.model('Meeting', meetingSchema); 