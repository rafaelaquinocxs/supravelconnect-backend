import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './config/database';

// Importar rotas existentes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import sessionRoutes from './routes/sessionRoutes';
import subscriptionRoutes from './routes/subscriptionRoutes';
import technicianRoutes from './routes/technicianRoutes';

// Importar handler de videochamadas
import { setupVideoCallHandlers } from './videocall/videocallHandlers';

dotenv.config();

const app = express();
const server = createServer(app);

// Configurar Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://seu-dominio.com'] 
      : ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Middlewares
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://seu-dominio.com'] 
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conectar ao MongoDB
connectDB();

// Rotas existentes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/technicians', technicianRoutes);

// Rota de status
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Supravel Connect API funcionando',
    videocall: 'Ativo',
    timestamp: new Date().toISOString()
  });
});

// Configurar handlers de videochamadas
setupVideoCallHandlers(io);

// Middleware de erro
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Algo deu errado!' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Servidor rodando em modo ${process.env.NODE_ENV || 'development'} na porta ${PORT}`);
  console.log(`🎥 Sistema de videochamadas ativo`);
});

export default app;
