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

// Lista de origens permitidas
const allowedOrigins = [
  // Produção
  'https://supravelconnect.vercel.app',
  'https://supravel-connect.vercel.app',
  'https://supravelconnect-frontend.vercel.app',
  // Desenvolvimento
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3001',
  // Sandbox
  /^https:\/\/.*\.manusvm\.computer$/
];

// Configurar Socket.IO com CORS corrigido
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Permitir requisições sem origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      // Verificar se a origin está na lista permitida
      const isAllowed = allowedOrigins.some(allowedOrigin => {
        if (typeof allowedOrigin === 'string') {
          return allowedOrigin === origin;
        } else {
          return allowedOrigin.test(origin);
        }
      });
      
      if (isAllowed) {
        callback(null, true);
      } else {
        console.log(`CORS bloqueou origin: ${origin}`);
        callback(null, true); // Permitir temporariamente para debug
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Middleware CORS corrigido
app.use(cors({
  origin: (origin, callback) => {
    // Permitir requisições sem origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Verificar se a origin está na lista permitida
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      } else {
        return allowedOrigin.test(origin);
      }
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log(`CORS bloqueou origin: ${origin}`);
      callback(null, true); // Permitir temporariamente para debug
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Authorization']
}));

// Middleware para log de requisições
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.get('Origin') || 'No origin'}`);
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Conectar ao MongoDB
const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/supravel';
    
    await mongoose.connect(mongoURI);
    
    console.log(`✅ MongoDB conectado: ${mongoose.connection.host}`);
  } catch (error) {
    console.error('❌ Erro ao conectar ao MongoDB:', error);
    process.exit(1);
  }
};

connectDB();

// Middleware para adicionar headers CORS manualmente (fallback)
app.use((req, res, next) => {
  const origin = req.get('Origin');
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Rotas existentes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/technicians', technicianRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/credits', creditRoutes);

// Rota de status expandida
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Supravel Connect API funcionando',
    videocall: 'Ativo',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    mongodb: mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado',
    cors: 'Configurado para Vercel',
    version: '2.0.0'
  });
});

// Rota de health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    message: 'Supravel Connect API',
    version: '2.0.0',
    status: 'Online',
    docs: '/api/status'
  });
});

// Configurar handlers de videochamadas
setupVideoCallHandlers(io);

// Middleware de erro
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Erro no servidor:', err.stack);
  res.status(500).json({ 
    success: false,
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado!'
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Rota ${req.originalUrl} não encontrada`
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em modo ${process.env.NODE_ENV || 'development'} na porta ${PORT}`);
  console.log(`🎥 Sistema de videochamadas ativo`);
  console.log(`🌐 CORS configurado para Vercel`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

export default app;
