import { Router } from 'express';
import { Response } from 'express';
import {
  getTechnicians,
  getTechnicianById,
  updateTechnicianProfile,
  getTechnicianStats,
  updateTechnicianAvailability
} from '../controllers/technicianController';

// Importar middleware de autenticação (corrigido)
import { authMiddleware } from '../middlewares/authMiddleware';

// Definir interface para Request com user
interface AuthenticatedRequest extends Request {
  user: any; // Usar any para evitar conflitos de tipagem
}

const router = Router();

// Rotas públicas
router.get('/', getTechnicians as any);

// Rotas protegidas (usando authMiddleware genérico)
router.get('/profile', authMiddleware, getTechnicianById as any);
router.put('/profile', authMiddleware, updateTechnicianProfile as any);
router.get('/stats', authMiddleware, getTechnicianStats as any);
router.put('/availability', authMiddleware, updateTechnicianAvailability as any);

export default router;
