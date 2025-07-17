import { Router, Request } from 'express';
import { Response } from 'express';

// Importar apenas as funções que existem no userController
import {
  getTechnicians,
  getTechnicianById,
  updateUserProfile as updateTechnicianProfile,
  getTechnicianStats,
  updateAvailability as updateTechnicianAvailability
} from '../controllers/userController';

// Importar middleware de autenticação
import { authMiddleware } from '../middlewares/authMiddleware';

// Definir interface para Request com user
interface AuthenticatedRequest extends Request {
  user: any; // Usar any para evitar conflitos de tipagem
}

const router = Router();

// Rotas públicas
router.get('/', getTechnicians as any);
router.get('/:id', getTechnicianById as any);

// Rotas protegidas (usando authMiddleware genérico)
router.get('/profile', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  // Redirecionar para getTechnicianById usando o ID do usuário logado
  req.params = { id: req.user._id };
  return getTechnicianById(req, res);
});

router.put('/profile', authMiddleware, updateTechnicianProfile as any);

router.get('/stats', authMiddleware, getTechnicianStats as any);

router.put('/availability', authMiddleware, updateTechnicianAvailability as any);

export default router;
