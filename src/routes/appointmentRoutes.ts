import { Router } from 'express';
import {
  createAppointment,
  getUserAppointments,
  getAppointmentById,
  respondToAppointment,
  startAppointment,
  completeAppointment,
  cancelAppointment,
  rateAppointment
} from '../controllers/appointmentController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Todas as rotas são protegidas
router.use(authMiddleware);

// @route   POST /api/appointments
// @desc    Criar novo agendamento
// @access  Private
router.post('/', createAppointment);

// @route   GET /api/appointments
// @desc    Listar agendamentos do usuário
// @access  Private
router.get('/', getUserAppointments);

// @route   GET /api/appointments/:id
// @desc    Obter detalhes de um agendamento
// @access  Private
router.get('/:id', getAppointmentById);

// @route   POST /api/appointments/:id/respond
// @desc    Responder a solicitação de agendamento (Helper)
// @access  Private (Helper)
router.post('/:id/respond', respondToAppointment);

// @route   POST /api/appointments/:id/start
// @desc    Iniciar agendamento
// @access  Private (Helper)
router.post('/:id/start', startAppointment);

// @route   POST /api/appointments/:id/complete
// @desc    Finalizar agendamento
// @access  Private (Helper)
router.post('/:id/complete', completeAppointment);

// @route   POST /api/appointments/:id/cancel
// @desc    Cancelar agendamento
// @access  Private
router.post('/:id/cancel', cancelAppointment);

// @route   POST /api/appointments/:id/rate
// @desc    Avaliar agendamento
// @access  Private
router.post('/:id/rate', rateAppointment);

export default router;

