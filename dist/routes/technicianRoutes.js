"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const technicianController_1 = require("../controllers/technicianController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
// Rotas públicas
router.get('/specialties', technicianController_1.getAllSpecialties);
// Rotas protegidas para todos os usuários
router.get('/:id', authMiddleware_1.protect, technicianController_1.getTechnicianById);
// Rotas protegidas para clientes
router.get('/available', authMiddleware_1.protect, authMiddleware_1.client, technicianController_1.getAvailableTechnicians);
// Rotas protegidas para técnicos
router.put('/availability', authMiddleware_1.protect, authMiddleware_1.technician, technicianController_1.updateAvailability);
router.put('/specialties', authMiddleware_1.protect, authMiddleware_1.technician, technicianController_1.updateSpecialties);
exports.default = router;
