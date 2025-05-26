const { Server } = require('socket.io');

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:5173",
        "https://connectlive-app.netlify.app",
        "https://frabjous-praline-6015b8.netlify.app"
      ],
      methods: ["GET", "POST"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"]
    }
  });

  // Store rooms with participant details
  const rooms = new Map();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', ({ roomId, userId, username }) => {
      socket.join(roomId);
      
      // Initialize room if it doesn't exist
      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Map());
      }

      // Store user details in the room
      rooms.get(roomId).set(userId, {
        socketId: socket.id,
        username: username,
        isAudioEnabled: true,
        isVideoEnabled: true,
        isScreenSharing: false,
        isHandRaised: false
      });

      // Notify others in the room
      socket.to(roomId).emit('user-joined', {
        userId,
        username,
        socketId: socket.id
      });

      // Send list of connected users to the new participant
      const participants = Array.from(rooms.get(roomId).entries()).map(([userId, user]) => ({
        userId,
        username: user.username,
        isAudioEnabled: user.isAudioEnabled,
        isVideoEnabled: user.isVideoEnabled,
        isScreenSharing: user.isScreenSharing,
        isHandRaised: user.isHandRaised
      }));
      
      io.to(socket.id).emit('room-users', participants);
      console.log(`User ${username} (${userId}) joined room ${roomId}`);
    });

    socket.on('disconnect', () => {
      // Find and remove user from their room
      rooms.forEach((participants, roomId) => {
        participants.forEach((user, userId) => {
          if (user.socketId === socket.id) {
            participants.delete(userId);
            socket.to(roomId).emit('user-disconnected', userId);
            console.log(`User ${user.username} (${userId}) left room ${roomId}`);
          }
        });
        // Clean up empty rooms
        if (participants.size === 0) {
          rooms.delete(roomId);
        }
      });
    });

    socket.on('sending-signal', ({ userToSignal, signal }) => {
      io.to(userToSignal).emit('user-joined', { signal, callerId: socket.id });
    });

    socket.on('returning-signal', ({ callerID, signal }) => {
      io.to(callerID).emit('receiving-returned-signal', { signal, id: socket.id });
    });

    socket.on('send-message', (message) => {
      const roomId = Array.from(socket.rooms)[1];
      if (roomId) {
        socket.to(roomId).emit('receive-message', message);
      }
    });

    socket.on('hand-raised', ({ userId, isRaised, roomId }) => {
      if (roomId && rooms.has(roomId)) {
        const participant = rooms.get(roomId).get(userId);
        if (participant) {
          participant.isHandRaised = isRaised;
          socket.to(roomId).emit('user-hand-raised', { userId, isRaised });
        }
      }
    });

    socket.on('toggle-media', ({ userId, roomId, type, enabled }) => {
      if (roomId && rooms.has(roomId)) {
        const participant = rooms.get(roomId).get(userId);
        if (participant) {
          if (type === 'audio') participant.isAudioEnabled = enabled;
          if (type === 'video') participant.isVideoEnabled = enabled;
          socket.to(roomId).emit('user-media-toggle', { userId, type, enabled });
        }
      }
    });

    socket.on('toggle-screen-share', ({ userId, roomId, isSharing }) => {
      if (roomId && rooms.has(roomId)) {
        const participant = rooms.get(roomId).get(userId);
        if (participant) {
          participant.isScreenSharing = isSharing;
          socket.to(roomId).emit('user-screen-share', { userId, isSharing });
        }
      }
    });
  });

  return io;
};

module.exports = initializeSocket; 