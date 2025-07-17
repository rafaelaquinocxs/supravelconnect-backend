"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const sessionModel_1 = __importStar(require("./models/sessionModel"));
const userModel_1 = __importDefault(require("./models/userModel"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Configuração do Socket.io para WebRTC
const setupSocketServer = (server) => {
    const io = new socket_io_1.Server(server, {
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
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'supravel_secret');
            // Buscar usuário
            const user = await userModel_1.default.findById(decoded.id).select('-password');
            if (!user) {
                return next(new Error('Usuário não encontrado'));
            }
            if (!user.isActive) {
                return next(new Error('Conta desativada'));
            }
            // Adicionar usuário ao socket
            socket.data.user = user;
            next();
        }
        catch (error) {
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
                const session = await sessionModel_1.default.findById(sessionId);
                if (!session) {
                    socket.emit('error', { message: 'Sessão não encontrada' });
                    return;
                }
                // Verificar permissão
                const userId = socket.data.user._id.toString();
                if (session.client.toString() !== userId &&
                    session.technician.toString() !== userId) {
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
            }
            catch (error) {
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
                const session = await sessionModel_1.default.findById(sessionId);
                if (!session) {
                    socket.emit('error', { message: 'Sessão não encontrada' });
                    return;
                }
                // Verificar se a sessão está agendada
                if (session.status !== sessionModel_1.SessionStatus.SCHEDULED) {
                    socket.emit('error', { message: `Não é possível iniciar uma sessão com status ${session.status}` });
                    return;
                }
                // Atualizar status da sessão
                session.status = sessionModel_1.SessionStatus.IN_PROGRESS;
                session.startTime = new Date();
                await session.save();
                // Notificar todos na sala
                io.to(sessionId).emit('call-started', {
                    sessionId,
                    startTime: session.startTime
                });
            }
            catch (error) {
                console.error('Erro ao iniciar chamada:', error);
                socket.emit('error', { message: 'Erro ao iniciar chamada' });
            }
        });
        // Encerrar chamada
        socket.on('end-call', async (sessionId) => {
            try {
                // Verificar se a sessão existe
                const session = await sessionModel_1.default.findById(sessionId);
                if (!session) {
                    socket.emit('error', { message: 'Sessão não encontrada' });
                    return;
                }
                // Verificar se a sessão está em andamento
                if (session.status !== sessionModel_1.SessionStatus.IN_PROGRESS) {
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
                session.status = sessionModel_1.SessionStatus.COMPLETED;
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
            }
            catch (error) {
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
exports.default = setupSocketServer;
