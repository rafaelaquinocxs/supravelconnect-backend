import { Router } from 'express';
import {
  getAvailableUsers,
  getUserProfile,
  getUsersBySpecialty,
  updateUserRating
} from '../controllers/technicianController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Todas as rotas são protegidas
router.use(authMiddleware);

// @route   GET /api/users/available
// @desc    Buscar usuários disponíveis para ajuda
// @access  Private
router.get('/available', getAvailableUsers);

// @route   GET /api/users/specialty/:specialty
// @desc    Buscar usuários por especialidade
// @access  Private
router.get('/specialty/:specialty', getUsersBySpecialty);

// @route   GET /api/users/:id
// @desc    Obter perfil de um usuário específico
// @access  Private
router.get('/:id', getUserProfile);

// @route   PUT /api/users/:id/rating
// @desc    Atualizar rating de um usuário
// @access  Private
router.put('/:id/rating', updateUserRating);

export default router;

