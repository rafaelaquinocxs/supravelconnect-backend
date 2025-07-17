import { Router } from 'express';
import { 
  getUserProfile,
  updateUserProfile,
  uploadProfileImage,
  uploadMiddleware,
  getTechnicians,
  getTechnicianById,
  updateAvailability,
  getTechnicianStats
} from '../controllers/userController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Rotas protegidas (requerem autenticação)
router.get('/profile', authMiddleware, getUserProfile);
router.put('/profile', authMiddleware, updateUserProfile);
router.post('/upload-image', authMiddleware, uploadMiddleware, uploadProfileImage);
router.put('/availability', authMiddleware, updateAvailability);
router.get('/technician-stats', authMiddleware, getTechnicianStats);

// Rotas públicas
router.get('/technicians', getTechnicians);
router.get('/technicians/:id', getTechnicianById);

// Rota para obter dados do usuário logado (compatibilidade)
router.get('/me', authMiddleware, getUserProfile);

export default router;
