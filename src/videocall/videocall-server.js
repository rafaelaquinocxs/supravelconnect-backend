const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Configuração CORS
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  credentials: true
}));

// Configuração Socket.IO
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Armazenar informações das salas e usuários
const rooms = new Map();
const users = new Map();

// Middleware para logging
app.use(express.json());

// Rota de status
app.get('/status', (req, res) => {
  res.json({ 
    status: 'online', 
    rooms: rooms.size, 
    users: users.size,
    timestamp: new Date().toISOString()
  });
});

// Eventos Socket.IO
io.on('connection', (socket) => {
  console.log(`👤 Usuário conectado: ${socket.id}`);

  // Registrar usuário
  socket.on('register-user', (userData) => {
    users.set(socket.id, {
      ...userData,
      socketId: socket.id,
      status: 'online'
    });
    console.log(`✅ Usuário registrado: ${userData.name} (${userData.role})`);
  });

  // Entrar em uma sala (sessão)
  socket.on('join-session', (sessionData) => {
    const { sessionId, userId, userName, userRole } = sessionData;
    
    socket.join(sessionId);
    
    // Inicializar sala se não existir
    if (!rooms.has(sessionId)) {
      rooms.set(sessionId, {
        sessionId,
        participants: new Map(),
        status: 'waiting',
        createdAt: new Date()
      });
    }
    
    const room = rooms.get(sessionId);
    room.participants.set(socket.id, {
      userId,
      userName,
      userRole,
      socketId: socket.id,
      joinedAt: new Date()
    });
    
    console.log(`🏠 ${userName} (${userRole}) entrou na sessão ${sessionId}`);
    
    // Notificar outros participantes
    socket.to(sessionId).emit('user-joined', {
      userId,
      userName,
      userRole,
      socketId: socket.id
    });
    
    // Enviar lista de participantes para o novo usuário
    const participants = Array.from(room.participants.values());
    socket.emit('session-participants', participants);
    
    // Se ambos (técnico e cliente) estão presentes, iniciar chamada
    const roles = participants.map(p => p.userRole);
    if (roles.includes('technician') && roles.includes('client')) {
      room.status = 'ready';
      io.to(sessionId).emit('session-ready', {
        message: 'Ambos os participantes estão presentes. Chamada pode ser iniciada.',
        participants
      });
    }
  });

  // Iniciar chamada de vídeo
  socket.on('start-video-call', (sessionId) => {
    const room = rooms.get(sessionId);
    if (room) {
      room.status = 'calling';
      socket.to(sessionId).emit('incoming-call', {
        from: socket.id,
        sessionId
      });
      console.log(`📞 Chamada iniciada na sessão ${sessionId}`);
    }
  });

  // Aceitar chamada
  socket.on('accept-call', (sessionId) => {
    const room = rooms.get(sessionId);
    if (room) {
      room.status = 'active';
      io.to(sessionId).emit('call-accepted', {
        sessionId,
        timestamp: new Date()
      });
      console.log(`✅ Chamada aceita na sessão ${sessionId}`);
    }
  });

  // Rejeitar chamada
  socket.on('reject-call', (sessionId) => {
    const room = rooms.get(sessionId);
    if (room) {
      room.status = 'rejected';
      io.to(sessionId).emit('call-rejected', {
        sessionId,
        timestamp: new Date()
      });
      console.log(`❌ Chamada rejeitada na sessão ${sessionId}`);
    }
  });

  // Sinalização WebRTC
  socket.on('webrtc-offer', (data) => {
    socket.to(data.sessionId).emit('webrtc-offer', {
      offer: data.offer,
      from: socket.id
    });
  });

  socket.on('webrtc-answer', (data) => {
    socket.to(data.sessionId).emit('webrtc-answer', {
      answer: data.answer,
      from: socket.id
    });
  });

  socket.on('webrtc-ice-candidate', (data) => {
    socket.to(data.sessionId).emit('webrtc-ice-candidate', {
      candidate: data.candidate,
      from: socket.id
    });
  });

  // Controles de mídia
  socket.on('toggle-audio', (data) => {
    socket.to(data.sessionId).emit('peer-audio-toggle', {
      userId: socket.id,
      audioEnabled: data.audioEnabled
    });
  });

  socket.on('toggle-video', (data) => {
    socket.to(data.sessionId).emit('peer-video-toggle', {
      userId: socket.id,
      videoEnabled: data.videoEnabled
    });
  });

  // Compartilhamento de tela
  socket.on('start-screen-share', (sessionId) => {
    socket.to(sessionId).emit('peer-screen-share-start', {
      userId: socket.id
    });
  });

  socket.on('stop-screen-share', (sessionId) => {
    socket.to(sessionId).emit('peer-screen-share-stop', {
      userId: socket.id
    });
  });

  // Chat durante a chamada
  socket.on('send-message', (data) => {
    const { sessionId, message, userName } = data;
    io.to(sessionId).emit('new-message', {
      message,
      userName,
      userId: socket.id,
      timestamp: new Date()
    });
  });

  // Finalizar chamada
  socket.on('end-call', (sessionId) => {
    const room = rooms.get(sessionId);
    if (room) {
      room.status = 'ended';
      room.endedAt = new Date();
      io.to(sessionId).emit('call-ended', {
        sessionId,
        endedBy: socket.id,
        timestamp: new Date()
      });
      console.log(`📴 Chamada finalizada na sessão ${sessionId}`);
    }
  });

  // Sair da sessão
  socket.on('leave-session', (sessionId) => {
    socket.leave(sessionId);
    const room = rooms.get(sessionId);
    if (room) {
      room.participants.delete(socket.id);
      socket.to(sessionId).emit('user-left', {
        userId: socket.id,
        timestamp: new Date()
      });
      
      // Se não há mais participantes, remover sala
      if (room.participants.size === 0) {
        rooms.delete(sessionId);
        console.log(`🗑️ Sala ${sessionId} removida (sem participantes)`);
      }
    }
  });

  // Desconexão
  socket.on('disconnect', () => {
    console.log(`👋 Usuário desconectado: ${socket.id}`);
    
    // Remover usuário
    users.delete(socket.id);
    
    // Remover de todas as salas
    rooms.forEach((room, sessionId) => {
      if (room.participants.has(socket.id)) {
        room.participants.delete(socket.id);
        socket.to(sessionId).emit('user-left', {
          userId: socket.id,
          timestamp: new Date()
        });
        
        // Se não há mais participantes, remover sala
        if (room.participants.size === 0) {
          rooms.delete(sessionId);
          console.log(`🗑️ Sala ${sessionId} removida (desconexão)`);
        }
      }
    });
  });

  // Ping/Pong para manter conexão
  socket.on('ping', () => {
    socket.emit('pong');
  });
});

// Limpeza periódica de salas vazias
setInterval(() => {
  const now = new Date();
  rooms.forEach((room, sessionId) => {
    // Remover salas vazias ou muito antigas (mais de 2 horas)
    const isOld = (now - room.createdAt) > (2 * 60 * 60 * 1000);
    const isEmpty = room.participants.size === 0;
    
    if (isEmpty || isOld) {
      rooms.delete(sessionId);
      console.log(`🧹 Limpeza: Sala ${sessionId} removida (${isEmpty ? 'vazia' : 'antiga'})`);
    }
  });
}, 30 * 60 * 1000); // A cada 30 minutos

const PORT = process.env.PORT || 8081;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor de videochamadas rodando na porta ${PORT}`);
  console.log(`📡 Socket.IO configurado para CORS`);
  console.log(`🌐 Acesse: http://localhost:${PORT}/status`);
});

module.exports = { app, server, io };