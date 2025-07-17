import { Server, Socket } from 'socket.io';

interface User {
  socketId: string;
  userId: string;
  userName: string;
  userRole: string;
}

interface Room {
  id: string;
  participants: User[];
  createdAt: Date;
}

interface WebRTCSignal {
  type: 'offer' | 'answer' | 'ice-candidate';
  data: any;
  from: string;
  to: string;
}

interface ChatMessage {
  sessionId: string;
  message: string;
  userName: string;
  timestamp: string;
  socketId: string;
}

// Armazenar salas ativas em memória
const activeRooms = new Map<string, Room>();
const userSockets = new Map<string, string>(); // userId -> socketId

export const setupVideoCallHandlers = (io: Server): void => {
  console.log('🎥 Configurando handlers de videochamadas...');

  io.on('connection', (socket: Socket) => {
    console.log(`👤 Usuário conectado: ${socket.id}`);

    // Entrar em uma sala de videochamada
    socket.on('join-videocall', (data: { sessionId: string; userId: string; userName: string; userRole: string }) => {
      try {
        const { sessionId, userId, userName, userRole } = data;
        
        console.log(`🎥 ${userName} (${userRole}) entrando na sala: ${sessionId}`);

        // Sair de salas anteriores
        socket.rooms.forEach(room => {
          if (room !== socket.id) {
            socket.leave(room);
          }
        });

        // Entrar na nova sala
        socket.join(sessionId);

        // Criar ou atualizar sala
        if (!activeRooms.has(sessionId)) {
          activeRooms.set(sessionId, {
            id: sessionId,
            participants: [],
            createdAt: new Date()
          });
        }

        const room = activeRooms.get(sessionId)!;
        
        // Remover participante existente (reconexão)
        room.participants = room.participants.filter(p => p.userId !== userId);
        
        // Adicionar novo participante
        const user: User = { socketId: socket.id, userId, userName, userRole };
        room.participants.push(user);
        userSockets.set(userId, socket.id);

        // Notificar todos na sala sobre participantes atualizados
        io.to(sessionId).emit('participants-updated', {
          participants: room.participants,
          total: room.participants.length
        });

        // Confirmar entrada
        socket.emit('joined-videocall', {
          sessionId,
          participants: room.participants,
          success: true
        });

        console.log(`✅ ${userName} entrou na sala ${sessionId}. Total: ${room.participants.length}`);

      } catch (error) {
        console.error('❌ Erro ao entrar na videochamada:', error);
        socket.emit('videocall-error', { message: 'Erro ao entrar na videochamada' });
      }
    });

    // Sinalização WebRTC
    socket.on('webrtc-signal', (data: WebRTCSignal) => {
      try {
        const { type, data: signalData, from, to } = data;
        
        console.log(`📡 Sinal WebRTC ${type} de ${from} para ${to}`);

        // Encontrar socket do destinatário
        const targetSocketId = userSockets.get(to);
        
        if (targetSocketId) {
          io.to(targetSocketId).emit('webrtc-signal', {
            type,
            data: signalData,
            from,
            to
          });
          console.log(`✅ Sinal ${type} enviado para ${to}`);
        } else {
          console.log(`❌ Usuário ${to} não encontrado`);
          socket.emit('videocall-error', { message: `Usuário ${to} não encontrado` });
        }

      } catch (error) {
        console.error('❌ Erro na sinalização WebRTC:', error);
        socket.emit('videocall-error', { message: 'Erro na sinalização WebRTC' });
      }
    });

    // Chat durante videochamada
    socket.on('videocall-message', (data: ChatMessage) => {
      try {
        const { sessionId, message, userName, timestamp } = data;
        
        console.log(`💬 Mensagem de ${userName} na sala ${sessionId}: ${message}`);

        // Enviar mensagem para todos na sala
        io.to(sessionId).emit('videocall-message', {
          sessionId,
          message,
          userName,
          timestamp,
          socketId: socket.id
        });

      } catch (error) {
        console.error('❌ Erro ao enviar mensagem:', error);
        socket.emit('videocall-error', { message: 'Erro ao enviar mensagem' });
      }
    });

    // Controles de mídia
    socket.on('media-control', (data: { sessionId: string; type: 'audio' | 'video'; enabled: boolean; userId: string }) => {
      try {
        const { sessionId, type, enabled, userId } = data;
        
        console.log(`🎛️ ${userId} ${enabled ? 'ativou' : 'desativou'} ${type} na sala ${sessionId}`);

        // Notificar outros participantes
        socket.to(sessionId).emit('participant-media-changed', {
          userId,
          type,
          enabled
        });

      } catch (error) {
        console.error('❌ Erro no controle de mídia:', error);
      }
    });

    // Sair da videochamada
    socket.on('leave-videocall', (data: { sessionId: string; userId: string }) => {
      try {
        const { sessionId, userId } = data;
        
        console.log(`👋 ${userId} saindo da sala ${sessionId}`);

        handleUserLeave(socket, sessionId, userId);

      } catch (error) {
        console.error('❌ Erro ao sair da videochamada:', error);
      }
    });

    // Desconexão
    socket.on('disconnect', () => {
      try {
        console.log(`👤 Usuário desconectado: ${socket.id}`);

        // Encontrar e remover usuário de todas as salas
        let userIdToRemove: string | null = null;
        
        for (const [userId, socketId] of userSockets.entries()) {
          if (socketId === socket.id) {
            userIdToRemove = userId;
            break;
          }
        }

        if (userIdToRemove) {
          userSockets.delete(userIdToRemove);

          // Remover de todas as salas ativas
          for (const [sessionId, room] of activeRooms.entries()) {
            const participantIndex = room.participants.findIndex(p => p.socketId === socket.id);
            
            if (participantIndex !== -1) {
              room.participants.splice(participantIndex, 1);
              
              // Notificar outros participantes
              socket.to(sessionId).emit('participants-updated', {
                participants: room.participants,
                total: room.participants.length
              });

              socket.to(sessionId).emit('user-left', {
                userId: userIdToRemove,
                participants: room.participants
              });

              console.log(`🚪 ${userIdToRemove} removido da sala ${sessionId}`);

              // Limpar sala vazia
              if (room.participants.length === 0) {
                activeRooms.delete(sessionId);
                console.log(`🗑️ Sala ${sessionId} removida (vazia)`);
              }
            }
          }
        }

      } catch (error) {
        console.error('❌ Erro na desconexão:', error);
      }
    });
  });

  // Função auxiliar para lidar com saída de usuário
  const handleUserLeave = (socket: Socket, sessionId: string, userId: string): void => {
    const room = activeRooms.get(sessionId);
    
    if (room) {
      // Remover participante
      room.participants = room.participants.filter(p => p.userId !== userId);
      userSockets.delete(userId);

      // Sair da sala
      socket.leave(sessionId);

      // Notificar outros participantes
      socket.to(sessionId).emit('participants-updated', {
        participants: room.participants,
        total: room.participants.length
      });

      socket.to(sessionId).emit('user-left', {
        userId,
        participants: room.participants
      });

      // Confirmar saída
      socket.emit('left-videocall', { sessionId, success: true });

      console.log(`✅ ${userId} saiu da sala ${sessionId}. Restam: ${room.participants.length}`);

      // Limpar sala vazia
      if (room.participants.length === 0) {
        activeRooms.delete(sessionId);
        console.log(`🗑️ Sala ${sessionId} removida (vazia)`);
      }
    }
  };

  // Limpeza periódica de salas antigas (opcional)
  setInterval(() => {
    const now = new Date();
    const maxAge = 2 * 60 * 60 * 1000; // 2 horas

    for (const [sessionId, room] of activeRooms.entries()) {
      if (now.getTime() - room.createdAt.getTime() > maxAge) {
        activeRooms.delete(sessionId);
        console.log(`🧹 Sala ${sessionId} removida (expirada)`);
      }
    }
  }, 30 * 60 * 1000); // Verificar a cada 30 minutos

  console.log('✅ Handlers de videochamadas configurados');
};
