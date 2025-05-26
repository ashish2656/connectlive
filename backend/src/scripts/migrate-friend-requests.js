const mongoose = require('mongoose');
const User = require('../models/User');

// MongoDB connection URL
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/connectlive';

async function migrateFriendRequests() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all users with friend requests
    const users = await User.find({ 'friendRequests.0': { $exists: true } });
    console.log(`Found ${users.length} users with friend requests`);

    // Update each user's friend requests
    for (const user of users) {
      // Create new friend requests array with proper schema
      const newFriendRequests = user.friendRequests.map(request => ({
        _id: new mongoose.Types.ObjectId(), // Generate new ObjectId
        sender: request.from || request.sender, // Handle both old and new property names
        status: request.status,
        createdAt: request.createdAt || new Date()
      }));

      // Update user's friend requests
      user.friendRequests = newFriendRequests;
      await user.save();
      console.log(`Updated friend requests for user ${user.username}`);
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run migration
migrateFriendRequests(); 