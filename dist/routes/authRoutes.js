"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
// Rotas públicas
router.post('/register', authController_1.register);
router.post('/login', authController_1.login);
// Rotas protegidas
router.get('/me', authMiddleware_1.protect, authController_1.getMe);
exports.default = router;
