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
      console.log(`User ${username} (${userId}) attempting to join room ${roomId}`);
      
      // Leave any existing rooms
      socket.rooms.forEach(room => {
        if (room !== socket.id) {
          socket.leave(room);
        }
      });

      // Join the new room
      socket.join(roomId);
      
      // Initialize room if it doesn't exist
      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Map());
      }

      // Store user details in the room
      const roomParticipants = rooms.get(roomId);
      roomParticipants.set(userId, {
        socketId: socket.id,
        username: username,
        isAudioEnabled: true,
        isVideoEnabled: true,
        isScreenSharing: false,
        isHandRaised: false
      });

      // Log room participants
      console.log(`Room ${roomId} participants:`, Array.from(roomParticipants.entries()));

      // Notify others in the room with socket ID
      socket.to(roomId).emit('user-joined', {
        userId,
        username,
        socketId: socket.id,
        isAudioEnabled: true,
        isVideoEnabled: true,
        isScreenSharing: false,
        isHandRaised: false
      });

      // Send list of connected users to the new participant
      const participants = Array.from(roomParticipants.entries()).map(([userId, user]) => ({
        userId,
        username: user.username,
        socketId: user.socketId,
        isAudioEnabled: user.isAudioEnabled,
        isVideoEnabled: user.isVideoEnabled,
        isScreenSharing: user.isScreenSharing,
        isHandRaised: user.isHandRaised
      }));
      
      // Emit room users to everyone in the room
      io.to(roomId).emit('room-users', participants);
      console.log(`Sent participants list to room ${roomId}:`, participants);

      // Signal the existing participants to create peer connections with the new user
      socket.to(roomId).emit('receive-signal', { signal: null, id: userId });
    });

    socket.on('disconnect', () => {
      // Find and remove user from their room
      rooms.forEach((participants, roomId) => {
        participants.forEach((user, userId) => {
          if (user.socketId === socket.id) {
            participants.delete(userId);
            socket.to(roomId).emit('user-disconnected', userId);
            console.log(`User ${user.username} (${userId}) left room ${roomId}`);

            // Send updated participants list
            const updatedParticipants = Array.from(participants.entries()).map(([id, user]) => ({
              userId: id,
              username: user.username,
              isAudioEnabled: user.isAudioEnabled,
              isVideoEnabled: user.isVideoEnabled,
              isScreenSharing: user.isScreenSharing,
              isHandRaised: user.isHandRaised
            }));
            io.to(roomId).emit('room-users', updatedParticipants);
          }
        });
        // Clean up empty rooms
        if (participants.size === 0) {
          rooms.delete(roomId);
        }
      });
    });

    socket.on('toggle-media', ({ userId, roomId, type, enabled }) => {
      if (roomId && rooms.has(roomId)) {
        const roomParticipants = rooms.get(roomId);
        const participant = roomParticipants.get(userId);
        if (participant) {
          if (type === 'audio') participant.isAudioEnabled = enabled;
          if (type === 'video') participant.isVideoEnabled = enabled;
          
          // Notify all participants in the room about the media change
          io.to(roomId).emit('user-media-toggle', { userId, type, enabled });
          
          // Send updated participants list
          const updatedParticipants = Array.from(roomParticipants.entries()).map(([id, user]) => ({
            userId: id,
            username: user.username,
            isAudioEnabled: user.isAudioEnabled,
            isVideoEnabled: user.isVideoEnabled,
            isScreenSharing: user.isScreenSharing,
            isHandRaised: user.isHandRaised
          }));
          io.to(roomId).emit('room-users', updatedParticipants);
        }
      }
    });

    socket.on('hand-raised', ({ userId, roomId, isRaised }) => {
      if (roomId && rooms.has(roomId)) {
        const roomParticipants = rooms.get(roomId);
        const participant = roomParticipants.get(userId);
        if (participant) {
          participant.isHandRaised = isRaised;
          
          // Notify all participants about the hand raise
          io.to(roomId).emit('user-hand-raised', { userId, isRaised });
          
          // Send updated participants list
          const updatedParticipants = Array.from(roomParticipants.entries()).map(([id, user]) => ({
            userId: id,
            username: user.username,
            isAudioEnabled: user.isAudioEnabled,
            isVideoEnabled: user.isVideoEnabled,
            isScreenSharing: user.isScreenSharing,
            isHandRaised: user.isHandRaised
          }));
          io.to(roomId).emit('room-users', updatedParticipants);
        }
      }
    });

    socket.on('toggle-screen-share', ({ userId, roomId, isSharing }) => {
      if (roomId && rooms.has(roomId)) {
        const roomParticipants = rooms.get(roomId);
        const participant = roomParticipants.get(userId);
        if (participant) {
          participant.isScreenSharing = isSharing;
          
          // Notify all participants about the screen share
          io.to(roomId).emit('user-screen-share', { userId, isSharing });
          
          // Send updated participants list
          const updatedParticipants = Array.from(roomParticipants.entries()).map(([id, user]) => ({
            userId: id,
            username: user.username,
            isAudioEnabled: user.isAudioEnabled,
            isVideoEnabled: user.isVideoEnabled,
            isScreenSharing: user.isScreenSharing,
            isHandRaised: user.isHandRaised
          }));
          io.to(roomId).emit('room-users', updatedParticipants);
        }
      }
    });

    // Handle WebRTC signaling
    socket.on('peer-signal', ({ userToSignal, callerId, signal }) => {
      const targetSocket = io.sockets.sockets.get(userToSignal);
      if (targetSocket) {
        targetSocket.emit('peer-signal', { signal, callerId });
      }
    });
  });

  return io;
};

module.exports = initializeSocket; 