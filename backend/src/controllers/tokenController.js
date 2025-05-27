const jwt = require('jsonwebtoken');

// Replace these with your actual 100ms credentials
const HMS_APP_ACCESS_KEY = process.env.HMS_APP_ACCESS_KEY;
const HMS_APP_SECRET = process.env.HMS_APP_SECRET;

const generateToken = async (req, res) => {
  try {
    const { userId, role, roomId } = req.body;

    if (!userId || !role || !roomId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, role, or roomId',
      });
    }

    // Generate JWT token for 100ms
    const payload = {
      access_key: HMS_APP_ACCESS_KEY,
      room_id: roomId,
      user_id: userId,
      role: role,
      type: 'app',
      version: 2,
      iat: Math.floor(Date.now() / 1000),
      nbf: Math.floor(Date.now() / 1000),
    };

    const token = jwt.sign(payload, HMS_APP_SECRET, {
      algorithm: 'HS256',
      expiresIn: '24h',
    });

    res.json({
      success: true,
      token,
    });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating token',
    });
  }
};

module.exports = {
  generateToken,
}; 