import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import Session, { SessionStatus } from './models/sessionModel';
import User, { UserRole } from './models/userModel';
import jwt from 'jsonwebtoken';

// Interface para o payload do token JWT
interface JwtPayload {
  id: string;
  role: UserRole;
}

// Configuração do Socket.io para WebRTC
const setupSocketServer = (server: HttpServer) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Middleware para autenticação
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Autenticação necessária'));
      }

      // Verificar token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supravel_secret') as JwtPayload;

      // Buscar usuário
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('Usuário não encontrado'));
      }

      if (!user.isActive) {
        return next(new Error('Conta desativada'));
      }

      // Adicionar usuário ao socket
      socket.data.user = user;
      next();
    } catch (error) {
      next(new Error('Token inválido'));
    }
  });

  // Conexão estabelecida
  io.on('connection', (socket) => {
    console.log(`Usuário conectado: ${socket.id}`);

    // Entrar em uma sala de sessão
    socket.on('join-session', async (sessionId) => {
      try {
        // Verificar se a sessão existe
        const session = await Session.findById(sessionId);
        
        if (!session) {
          socket.emit('error', { message: 'Sessão não encontrada' });
          return;
        }

        // Verificar permissão
        const userId = socket.data.user._id.toString();
        if (
          session.client.toString() !== userId &&
          session.technician.toString() !== userId
        ) {
          socket.emit('error', { message: 'Acesso negado a esta sessão' });
          return;
        }

        // Entrar na sala
        socket.join(sessionId);
        console.log(`Usuário ${userId} entrou na sessão ${sessionId}`);

        // Notificar outros usuários na sala
        socket.to(sessionId).emit('user-joined', {
          userId,
          name: socket.data.user.name,
          role: socket.data.user.role
        });

        // Enviar lista de usuários na sala
        const clients = io.sockets.adapter.rooms.get(sessionId);
        const users = [];
        
        if (clients) {
          for (const clientId of clients) {
            const clientSocket = io.sockets.sockets.get(clientId);
            if (clientSocket && clientSocket.data.user) {
              users.push({
                userId: clientSocket.data.user._id,
                name: clientSocket.data.user.name,
                role: clientSocket.data.user.role
              });
            }
          }
        }

        socket.emit('session-users', users);
      } catch (error) {
        console.error('Erro ao entrar na sessão:', error);
        socket.emit('error', { message: 'Erro ao entrar na sessão' });
      }
    });

    // Sinalização WebRTC
    socket.on('signal', ({ to, signal, from }) => {
      socket.to(to).emit('signal', { from, signal });
    });

    // Iniciar chamada
    socket.on('start-call', async (sessionId) => {
      try {
        // Verificar se a sessão existe
        const session = await Session.findById(sessionId);
        
        if (!session) {
          socket.emit('error', { message: 'Sessão não encontrada' });
          return;
        }

        // Verificar se a sessão está agendada
        if (session.status !== SessionStatus.SCHEDULED) {
          socket.emit('error', { message: `Não é possível iniciar uma sessão com status ${session.status}` });
          return;
        }

        // Atualizar status da sessão
        session.status = SessionStatus.IN_PROGRESS;
        session.startTime = new Date();
        await session.save();

        // Notificar todos na sala
        io.to(sessionId).emit('call-started', {
          sessionId,
          startTime: session.startTime
        });
      } catch (error) {
        console.error('Erro ao iniciar chamada:', error);
        socket.emit('error', { message: 'Erro ao iniciar chamada' });
      }
    });

    // Encerrar chamada
    socket.on('end-call', async (sessionId) => {
      try {
        // Verificar se a sessão existe
        const session = await Session.findById(sessionId);
        
        if (!session) {
          socket.emit('error', { message: 'Sessão não encontrada' });
          return;
        }

        // Verificar se a sessão está em andamento
        if (session.status !== SessionStatus.IN_PROGRESS) {
          socket.emit('error', { message: `Não é possível encerrar uma sessão com status ${session.status}` });
          return;
        }

        // Calcular duração
        const endTime = new Date();
        const durationInSeconds = session.startTime 
          ? Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000) 
          : 0;
        
        // Converter segundos para minutos (arredondando para cima)
        const durationInMinutes = Math.ceil(durationInSeconds / 60);

        // Atualizar sessão
        session.status = SessionStatus.COMPLETED;
        session.endTime = endTime;
        session.duration = durationInSeconds;
        session.creditsUsed = durationInMinutes;
        await session.save();

        // Notificar todos na sala
        io.to(sessionId).emit('call-ended', {
          sessionId,
          endTime: session.endTime,
          duration: durationInSeconds,
          creditsUsed: durationInMinutes
        });
      } catch (error) {
        console.error('Erro ao encerrar chamada:', error);
        socket.emit('error', { message: 'Erro ao encerrar chamada' });
      }
    });

    // Desconexão
    socket.on('disconnect', () => {
      console.log(`Usuário desconectado: ${socket.id}`);
    });
  });

  return io;
};

export default setupSocketServer;
