import express from 'express';
import { 
  getAvailableTechnicians, 
  getTechnicianById, 
  updateAvailability, 
  getAllSpecialties,
  updateSpecialties
} from '../controllers/technicianController';
import { protect, client, technician } from '../middlewares/authMiddleware';

const router = express.Router();

// Rotas públicas
router.get('/specialties', getAllSpecialties);

// Rotas protegidas para todos os usuários
router.get('/:id', protect, getTechnicianById);

// Rotas protegidas para clientes
router.get('/available', protect, client, getAvailableTechnicians);

// Rotas protegidas para técnicos
router.put('/availability', protect, technician, updateAvailability);
router.put('/specialties', protect, technician, updateSpecialties);

export default router;
