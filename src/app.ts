import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Importar rotas
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import sessionRoutes from './routes/sessionRoutes';
import subscriptionRoutes from './routes/subscriptionRoutes';

// Carregar variáveis de ambiente
dotenv.config();

// Função para conectar ao banco de dados (substituindo ./config/db)
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

// Conectar ao banco de dados
connectDB();

// Inicializar Express
const app: Express = express();

// Middleware CORS (configurado para produção e desenvolvimento)
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL || 'https://seu-frontend.vercel.app'] 
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logging personalizado (substituindo morgan)
if (process.env.NODE_ENV === 'development') {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.url;
    const ip = req.ip || req.connection.remoteAddress;
    
    console.log(`[${timestamp}] ${method} ${url} - ${ip}`);
    next();
  });
}

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// Rota de status para monitoramento
app.get('/api/status', (req: Request, res: Response) => {
  res.json({ 
    status: 'OK', 
    message: 'Supravel Connect API funcionando',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado'
  });
});

// Rota básica
app.get('/', (req: Request, res: Response) => {
  res.json({ 
    message: 'API Supravel Connect funcionando!',
    version: '1.0.0',
    status: 'Online'
  });
});

// Middleware de erro para rotas não encontradas
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint não encontrado',
    path: req.path,
    method: req.method
  });
});

// Middleware de tratamento de erros
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Erro capturado:', err.stack);
  
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Erro interno',
    timestamp: new Date().toISOString()
  });
});

export default app;