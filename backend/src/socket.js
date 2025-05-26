const { Server } = require('socket.io');

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: ["http://localhost:5173", "https://connectlive-psi.vercel.app"],
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  const rooms = new Map();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', ({ roomId, userId }) => {
      socket.join(roomId);
      
      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
      }
      rooms.get(roomId).add(userId);

      // Notify others in the room
      socket.to(roomId).emit('user-joined', {
        userId,
        username: socket.username
      });

      // Send list of connected users to the new participant
      const participants = Array.from(rooms.get(roomId));
      socket.emit('room-users', participants);

      console.log(`User ${userId} joined room ${roomId}`);
    });

    socket.on('sending-signal', ({ userToSignal, signal }) => {
      io.to(userToSignal).emit('user-joined', { signal, callerId: socket.id });
    });

    socket.on('returning-signal', ({ callerID, signal }) => {
      io.to(callerID).emit('receiving-returned-signal', { signal, id: socket.id });
    });

    socket.on('send-message', (message) => {
      const roomId = Array.from(socket.rooms)[1]; // First room is socket's own room
      if (roomId) {
        socket.to(roomId).emit('receive-message', message);
      }
    });

    socket.on('hand-raised', ({ userId, isRaised }) => {
      const roomId = Array.from(socket.rooms)[1];
      if (roomId) {
        socket.to(roomId).emit('user-hand-raised', { userId, isRaised });
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      
      // Remove user from all rooms
      rooms.forEach((users, roomId) => {
        if (users.has(socket.id)) {
          users.delete(socket.id);
          socket.to(roomId).emit('user-disconnected', socket.id);
          
          if (users.size === 0) {
            rooms.delete(roomId);
          }
        }
      });
    });
  });

  return io;
};

module.exports = initializeSocket; 