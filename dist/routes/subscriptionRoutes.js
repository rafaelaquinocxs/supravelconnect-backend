"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const subscriptionController_1 = require("../controllers/subscriptionController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
// Rotas protegidas para clientes
router.post('/', authMiddleware_1.protect, authMiddleware_1.client, subscriptionController_1.createSubscription);
router.get('/current', authMiddleware_1.protect, authMiddleware_1.client, subscriptionController_1.getCurrentSubscription);
router.delete('/:id', authMiddleware_1.protect, authMiddleware_1.client, subscriptionController_1.cancelSubscription);
// Webhook público para Asaas
router.post('/webhook', subscriptionController_1.asaasWebhook);
exports.default = router;
