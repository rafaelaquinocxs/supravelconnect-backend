import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import connectDB from './config/db';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import sessionRoutes from './routes/sessionRoutes';
import subscriptionRoutes from './routes/subscriptionRoutes';
import VideoCall from '../components/VideoCall';

// Carregar variáveis de ambiente
dotenv.config();

// Conectar ao banco de dados
connectDB();

// Inicializar Express
const app: Express = express();

app.use('/api/subscriptions', subscriptionRoutes);

// Middleware CORS
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logging em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sessions', sessionRoutes);

// Rota básica
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'API Supravel Connect funcionando!' });
});

// Middleware de erro para rotas não encontradas
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint não encontrado'
  });
});

// Middleware de tratamento de erros
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

export default app;

