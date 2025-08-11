import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import morgan from 'morgan';

// Configurar dotenv primeiro
dotenv.config();

const app = express();
const server = createServer(app);

// Configuração de CORS expandida para Vercel
const allowedOrigins = [
  'https://supravelconnect.vercel.app',
  'https://supravel-connect.vercel.app',
  'https://supravelconnect-frontend.vercel.app',
  'https://supravelconnect-git-main.vercel.app',
  'https://supravelconnect-git-master.vercel.app',
  process.env.FRONTEND_URL,
  // Desenvolvimento
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3001',
  // Sandbox
  /^https:\/\/.*\.manusvm\.computer$/
].filter(Boolean);

// Função para verificar origin dinamicamente
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Permitir requisições sem origin (mobile apps, Postman, etc.)
    if (!origin) {
      console.log('🔓 Requisição sem origin permitida');
      return callback(null, true);
    }

    // Verificar se origin está na lista permitida
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return origin === allowedOrigin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });

    if (isAllowed) {
      console.log(`✅ Origin permitida: ${origin}`);
      callback(null, true);
    } else {
      console.log(`❌ Origin bloqueada: ${origin}`);
      console.log(`📋 Origins permitidas:`, allowedOrigins);
      
      // Em produção, permitir temporariamente para debug
      if (process.env.NODE_ENV === 'production') {
        console.log('🚨 Permitindo origin em produção para debug');
        callback(null, true);
      } else {
        callback(new Error('Não permitido pelo CORS'), false);
      }
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
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  maxAge: 86400 // 24 horas
};

// Configurar Socket.IO com CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Middlewares básicos
app.use(morgan('combined'));
app.use(cors(corsOptions));

// Middleware adicional de CORS como fallback
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.header('Access-Control-Allow-Origin', '*');
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

// Conectar ao banco
connectDB();

// Importar e configurar rotas com tratamento de erro
try {
  // Importações dinâmicas para evitar erros de módulo
  const authRoutes = require('./routes/authRoutes');
  const userRoutes = require('./routes/userRoutes');
  const sessionRoutes = require('./routes/sessionRoutes');
  const subscriptionRoutes = require('./routes/subscriptionRoutes');
  const technicianRoutes = require('./routes/technicianRoutes');
  const appointmentRoutes = require('./routes/appointmentRoutes');
  const creditRoutes = require('./routes/creditRoutes');

  // Configurar rotas
  app.use('/api/auth', authRoutes.default || authRoutes);
  app.use('/api/users', userRoutes.default || userRoutes);
  app.use('/api/sessions', sessionRoutes.default || sessionRoutes);
  app.use('/api/subscriptions', subscriptionRoutes.default || subscriptionRoutes);
  app.use('/api/technicians', technicianRoutes.default || technicianRoutes);
  app.use('/api/appointments', appointmentRoutes.default || appointmentRoutes);
  app.use('/api/credits', creditRoutes.default || creditRoutes);

  console.log('✅ Todas as rotas carregadas com sucesso');
} catch (error) {
  console.error('❌ Erro ao carregar rotas:', error);
}

// Configurar handlers de videochamadas com tratamento de erro
try {
  const { setupVideoCallHandlers } = require('./videocall/videocallHandlers');
  setupVideoCallHandlers(io);
  console.log('✅ Handlers de videochamada configurados');
} catch (error) {
  console.error('⚠️ Erro ao configurar videochamadas (continuando sem elas):', error);
}

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Status expandido
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Supravel Connect API funcionando',
    videocall: 'Ativo',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    cors: {
      allowedOrigins: allowedOrigins.length,
      production: process.env.NODE_ENV === 'production'
    },
    database: {
      connected: mongoose.connection.readyState === 1,
      host: mongoose.connection.host
    }
  });
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    message: 'Supravel Connect API',
    version: '1.0.0',
    status: 'Online',
    timestamp: new Date().toISOString()
  });
});

// Middleware de log de requisições
app.use((req, res, next) => {
  console.log(`📝 ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

// Middleware de erro global
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Erro no servidor:', err.stack);
  
  res.status(err.status || 500).json({ 
    message: process.env.NODE_ENV === 'production' 
      ? 'Erro interno do servidor' 
      : err.message,
    error: process.env.NODE_ENV === 'production' 
      ? {} 
      : err
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Rota não encontrada',
    path: req.originalUrl,
    method: req.method
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em modo ${process.env.NODE_ENV || 'development'} na porta ${PORT}`);
  console.log(`🎥 Sistema de videochamadas ativo`);
  console.log(`🌐 CORS configurado para ${allowedOrigins.length} origens`);
  console.log(`📊 MongoDB: ${mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado'}`);
});

// Tratamento de sinais de encerramento
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM recebido, encerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor encerrado');
    mongoose.connection.close();
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT recebido, encerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor encerrado');
    mongoose.connection.close();
  });
});

export default app;
