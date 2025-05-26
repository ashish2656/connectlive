const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// Routes
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/room');
const friendRoutes = require('./routes/friends');
const usersRoutes = require('./routes/users');

// Middleware
const { authenticateToken } = require('./middleware/auth');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [process.env.FRONTEND_URL || 'http://localhost:3000', 'https://connectlive.vercel.app'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:3000', 'https://connectlive.vercel.app'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/connectlive')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to ConnectLive API',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile'
      },
      rooms: {
        create: 'POST /api/rooms',
        list: 'GET /api/rooms',
        getRoom: 'GET /api/rooms/:roomId'
      },
      friends: {
        list: 'GET /api/friends'
      },
      users: {
        search: 'GET /api/users/search'
      }
    }
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/friends', authenticateToken, friendRoutes);
app.use('/api/rooms', authenticateToken, roomRoutes);
app.use('/api/users', authenticateToken, usersRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-connected', userId);
  });

  socket.on('send-message', (roomId, message) => {
    socket.to(roomId).emit('receive-message', message);
  });

  socket.on('start-share-screen', (roomId, userId) => {
    socket.to(roomId).emit('user-share-screen', userId);
  });

  socket.on('stop-share-screen', (roomId, userId) => {
    socket.to(roomId).emit('user-stop-share-screen', userId);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 