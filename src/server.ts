import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';

// Importar rotas existentes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import sessionRoutes from './routes/sessionRoutes';
import subscriptionRoutes from './routes/subscriptionRoutes';
import technicianRoutes from './routes/technicianRoutes';
import appointmentRoutes from './routes/appointmentRoutes';
import creditRoutes from './routes/creditRoutes';

// Importar handler de videochamadas
import { setupVideoCallHandlers } from './videocall/videocallHandlers';

dotenv.config();

const app = express();
const server = createServer(app);

// Configurar Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? [
          process.env.FRONTEND_URL || 'https://seu-frontend.vercel.app',
          'https://supravelconnect.vercel.app'
        ] 
      : [
          'http://localhost:3000', 
          'http://localhost:5173',
          'http://127.0.0.1:5173',
          'http://localhost:3001',
          /^https:\/\/.*\.manusvm\.computer$/
        ],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Middlewares
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [
        process.env.FRONTEND_URL || 'https://seu-frontend.vercel.app',
        'https://supravelconnect.vercel.app'
      ] 
    : [
        'http://localhost:3000', 
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3001',
        /^https:\/\/.*\.manusvm\.computer$/
      ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conectar ao MongoDB
const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/supravel';
    
    await mongoose.connect(mongoURI);
    
    console.log(`MongoDB conectado: ${mongoose.connection.host}`);
  } catch (error) {
    console.error('Erro ao conectar ao MongoDB:', error);
    process.exit(1);
  }
};

connectDB();

// Rotas existentes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/technicians', technicianRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/credits', creditRoutes);

// Rota de status
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Supravel Connect API funcionando',
    videocall: 'Ativo',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    message: 'Supravel Connect API',
    version: '1.0.0',
    status: 'Online'
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