import { Router } from 'express';
import {
  scheduleSession,
  getUserSessions,
  getSessionById,
  respondToSession,
  startSession,
  endSession,
  cancelSession,
  addSessionRating,
  getTechnicianStats,
  getTechnicianAvailability
} from '../controllers/sessionController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Rotas públicas
router.get('/technician/:id/availability', getTechnicianAvailability);

// Rotas protegidas
router.use(authMiddleware);

// Rotas gerais de sessões
router.post('/schedule', scheduleSession);
router.get('/', getUserSessions);
router.get('/:id', getSessionById);

// Ações de sessão
router.post('/:id/respond', respondToSession);
router.post('/:id/start', startSession);
router.post('/:id/end', endSession);
router.post('/:id/cancel', cancelSession);
router.post('/:id/rating', addSessionRating);

// Estatísticas do técnico
router.get('/technician/stats', getTechnicianStats);

export default router;

