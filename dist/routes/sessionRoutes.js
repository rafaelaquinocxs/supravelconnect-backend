"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const sessionController_1 = require("../controllers/sessionController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
// Rotas protegidas para todos os usuários
router.get('/', authMiddleware_1.protect, sessionController_1.getUserSessions);
router.get('/:id', authMiddleware_1.protect, sessionController_1.getSessionById);
// Rotas protegidas para clientes
router.post('/', authMiddleware_1.protect, authMiddleware_1.client, sessionController_1.createSession);
router.put('/:id/rate', authMiddleware_1.protect, authMiddleware_1.client, sessionController_1.rateSession);
// Rotas protegidas para clientes e técnicos
router.put('/:id/start', authMiddleware_1.protect, sessionController_1.startSession);
router.put('/:id/end', authMiddleware_1.protect, sessionController_1.endSession);
// Rotas protegidas para admin
router.get('/:id/recording', authMiddleware_1.protect, authMiddleware_1.admin, sessionController_1.getRecordingUrl);
exports.default = router;
