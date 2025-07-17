import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Rotas públicas
router.post('/register', register);
router.post('/login', login);

// Rotas protegidas
router.get('/me', authMiddleware, getMe); // ✅ uso correto do middleware

export default router;
