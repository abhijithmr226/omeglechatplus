const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

let waitingUsers = [];
let activeConnections = new Map();
let onlineCount = 0;

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  onlineCount++;
  
  // Broadcast updated online count
  io.emit('online-count', onlineCount);

  socket.on('find-peer', (data) => {
    const { interests, mode } = data;
    
    // Find a matching peer
    const matchingPeer = waitingUsers.find(user => 
      user.mode === mode && 
      (!interests?.length || user.interests?.some(interest => 
        interests.includes(interest)
      ))
    );

    if (matchingPeer) {
      // Remove matched peer from waiting list
      waitingUsers = waitingUsers.filter(user => user.socketId !== matchingPeer.socketId);
      
      // Create room for the pair
      const roomId = `room_${socket.id}_${matchingPeer.socketId}`;
      
      socket.join(roomId);
      io.sockets.sockets.get(matchingPeer.socketId)?.join(roomId);
      
      // Store active connection
      activeConnections.set(socket.id, { roomId, peerId: matchingPeer.socketId });
      activeConnections.set(matchingPeer.socketId, { roomId, peerId: socket.id });
      
      // Notify both users
      socket.emit('peer-found', { roomId, peerId: matchingPeer.socketId });
      io.to(matchingPeer.socketId).emit('peer-found', { roomId, peerId: socket.id });
      
    } else {
      // Add to waiting list
      waitingUsers.push({
        socketId: socket.id,
        interests: interests || [],
        mode,
        timestamp: Date.now()
      });
      
      socket.emit('waiting-for-peer');
    }
  });

  // WebRTC signaling
  socket.on('offer', (data) => {
    const connection = activeConnections.get(socket.id);
    if (connection) {
      io.to(connection.peerId).emit('offer', {
        offer: data.offer,
        from: socket.id
      });
    }
  });

  socket.on('answer', (data) => {
    const connection = activeConnections.get(socket.id);
    if (connection) {
      io.to(connection.peerId).emit('answer', {
        answer: data.answer,
        from: socket.id
      });
    }
  });

  socket.on('ice-candidate', (data) => {
    const connection = activeConnections.get(socket.id);
    if (connection) {
      io.to(connection.peerId).emit('ice-candidate', {
        candidate: data.candidate,
        from: socket.id
      });
    }
  });

  socket.on('chat-message', (data) => {
    const connection = activeConnections.get(socket.id);
    if (connection) {
      io.to(connection.peerId).emit('chat-message', {
        message: data.message,
        from: socket.id
      });
    }
  });

  socket.on('disconnect-peer', () => {
    const connection = activeConnections.get(socket.id);
    if (connection) {
      io.to(connection.peerId).emit('peer-disconnected');
      activeConnections.delete(socket.id);
      activeConnections.delete(connection.peerId);
    }
    
    // Remove from waiting list
    waitingUsers = waitingUsers.filter(user => user.socketId !== socket.id);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    onlineCount--;
    io.emit('online-count', onlineCount);
    
    const connection = activeConnections.get(socket.id);
    if (connection) {
      io.to(connection.peerId).emit('peer-disconnected');
      activeConnections.delete(connection.peerId);
    }
    activeConnections.delete(socket.id);
    
    // Remove from waiting list
    waitingUsers = waitingUsers.filter(user => user.socketId !== socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});