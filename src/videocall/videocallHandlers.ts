import { Server, Socket } from 'socket.io';

interface User {
  socketId: string;
  userId: string;
  userName: string;
  userRole: string;
}

interface SessionRoom {
  sessionId: string;
  participants: Map<string, User>;
  callActive: boolean;
  callInitiator?: string;
}

const sessions = new Map<string, SessionRoom>();
const userSockets = new Map<string, string>(); // userId -> socketId

export const setupVideoCallHandlers = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(`🔗 Cliente conectado: ${socket.id}`);

    // Registrar usuário
    socket.on('register-user', (data: { userId: string; name: string; role: string }) => {
      userSockets.set(data.userId, socket.id);
      console.log(`👤 Usuário registrado: ${data.name} (${data.role})`);
    });

    // Entrar em uma sessão
    socket.on('join-session', (data: { sessionId: string; userId: string; userName: string; userRole: string }) => {
      const { sessionId, userId, userName, userRole } = data;
      
      // Criar ou obter sessão
      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {
          sessionId,
          participants: new Map(),
          callActive: false
        });
      }
      
      const session = sessions.get(sessionId)!;
      
      // Adicionar participante
      const user: User = {
        socketId: socket.id,
        userId,
        userName,
        userRole
      };
      
      session.participants.set(socket.id, user);
      socket.join(sessionId);
      
      console.log(`👥 ${userName} entrou na sessão ${sessionId}`);
      
      // Notificar outros participantes
      socket.to(sessionId).emit('user-joined', user);
      
      // Enviar lista de participantes
      const participantsList = Array.from(session.participants.values());
      io.to(sessionId).emit('session-participants', participantsList);
      
      // Se há 2 participantes, sessão está pronta
      if (session.participants.size >= 2) {
        io.to(sessionId).emit('session-ready', {
          message: 'Sessão pronta para iniciar videochamada',
          participants: participantsList.length
        });
      }
    });

    // Iniciar videochamada
    socket.on('start-video-call', (sessionId: string) => {
      const session = sessions.get(sessionId);
      if (!session) return;
      
      const user = session.participants.get(socket.id);
      if (!user) return;
      
      session.callActive = true;
      session.callInitiator = socket.id;
      
      console.log(`📞 ${user.userName} iniciou videochamada na sessão ${sessionId}`);
      
      // Notificar outros participantes
      socket.to(sessionId).emit('incoming-call', {
        from: user,
        sessionId
      });
    });

    // Aceitar chamada
    socket.on('accept-call', (sessionId: string) => {
      const session = sessions.get(sessionId);
      if (!session) return;
      
      const user = session.participants.get(socket.id);
      if (!user) return;
      
      console.log(`✅ ${user.userName} aceitou a videochamada`);
      
      // Notificar que a chamada foi aceita
      io.to(sessionId).emit('call-accepted', {
        acceptedBy: user
      });
    });

    // Rejeitar chamada
    socket.on('reject-call', (sessionId: string) => {
      const session = sessions.get(sessionId);
      if (!session) return;
      
      const user = session.participants.get(socket.id);
      if (!user) return;
      
      session.callActive = false;
      session.callInitiator = undefined;
      
      console.log(`❌ ${user.userName} rejeitou a videochamada`);
      
      // Notificar que a chamada foi rejeitada
      io.to(sessionId).emit('call-rejected', {
        rejectedBy: user
      });
    });

    // Finalizar chamada
    socket.on('end-call', (sessionId: string) => {
      const session = sessions.get(sessionId);
      if (!session) return;
      
      const user = session.participants.get(socket.id);
      if (!user) return;
      
      session.callActive = false;
      session.callInitiator = undefined;
      
      console.log(`📴 ${user.userName} finalizou a videochamada`);
      
      // Notificar que a chamada foi finalizada
      io.to(sessionId).emit('call-ended', {
        endedBy: user
      });
    });

    // Sinalização WebRTC
    socket.on('webrtc-offer', (data: { offer: any; sessionId: string }) => {
      console.log(`📨 Oferta WebRTC recebida para sessão ${data.sessionId}`);
      socket.to(data.sessionId).emit('webrtc-offer', {
        offer: data.offer,
        from: socket.id
      });
    });

    socket.on('webrtc-answer', (data: { answer: any; sessionId: string }) => {
      console.log(`📨 Resposta WebRTC recebida para sessão ${data.sessionId}`);
      socket.to(data.sessionId).emit('webrtc-answer', {
        answer: data.answer,
        from: socket.id
      });
    });

    socket.on('webrtc-ice-candidate', (data: { candidate: any; sessionId: string }) => {
      console.log(`🧊 ICE candidate recebido para sessão ${data.sessionId}`);
      socket.to(data.sessionId).emit('webrtc-ice-candidate', {
        candidate: data.candidate,
        from: socket.id
      });
    });

    // Controles de mídia
    socket.on('toggle-audio', (data: { sessionId: string; audioEnabled: boolean }) => {
      socket.to(data.sessionId).emit('peer-audio-toggle', {
        audioEnabled: data.audioEnabled,
        from: socket.id
      });
    });

    socket.on('toggle-video', (data: { sessionId: string; videoEnabled: boolean }) => {
      socket.to(data.sessionId).emit('peer-video-toggle', {
        videoEnabled: data.videoEnabled,
        from: socket.id
      });
    });

    // Compartilhamento de tela
    socket.on('start-screen-share', (sessionId: string) => {
      socket.to(sessionId).emit('peer-screen-share-started', {
        from: socket.id
      });
    });

    socket.on('stop-screen-share', (sessionId: string) => {
      socket.to(sessionId).emit('peer-screen-share-stopped', {
        from: socket.id
      });
    });

    // Chat
    socket.on('send-message', (data: { sessionId: string; message: string; userName: string }) => {
      const messageData = {
        ...data,
        timestamp: new Date().toISOString(),
        socketId: socket.id
      };
      
      console.log(`💬 Mensagem de ${data.userName}: ${data.message}`);
      
      // Enviar para todos na sessão (incluindo o remetente)
      io.to(data.sessionId).emit('new-message', messageData);
    });

    // Desconexão
    socket.on('disconnect', () => {
      console.log(`🔌 Cliente desconectado: ${socket.id}`);
      
      // Remover usuário de todas as sessões
      for (const [sessionId, session] of sessions.entries()) {
        if (session.participants.has(socket.id)) {
          const user = session.participants.get(socket.id);
          session.participants.delete(socket.id);
          
          console.log(`👋 ${user?.userName} saiu da sessão ${sessionId}`);
          
          // Notificar outros participantes
          socket.to(sessionId).emit('user-left', {
            userId: socket.id,
            userName: user?.userName
          });
          
          // Se a sessão ficou vazia, remover
          if (session.participants.size === 0) {
            sessions.delete(sessionId);
            console.log(`🗑️ Sessão ${sessionId} removida (vazia)`);
          } else {
            // Atualizar lista de participantes
            const participantsList = Array.from(session.participants.values());
            io.to(sessionId).emit('session-participants', participantsList);
          }
          
          // Se era uma chamada ativa, finalizar
          if (session.callActive) {
            session.callActive = false;
            session.callInitiator = undefined;
            io.to(sessionId).emit('call-ended', {
              endedBy: user,
              reason: 'disconnect'
            });
          }
        }
      }
      
      // Remover do mapa de usuários
      for (const [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) {
          userSockets.delete(userId);
          break;
        }
      }
    });
  });

  // Log de status a cada 30 segundos
  setInterval(() => {
    console.log(`📊 Status: ${sessions.size} sessões ativas, ${userSockets.size} usuários conectados`);
  }, 30000);
};
