"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.asaasWebhook = exports.cancelSubscription = exports.getCurrentSubscription = exports.createSubscription = void 0;
const subscriptionModel_1 = __importStar(require("../models/subscriptionModel"));
const userModel_1 = require("../models/userModel");
const asaasService_1 = __importDefault(require("../services/asaasService"));
// @desc    Criar uma assinatura
// @route   POST /api/subscriptions
// @access  Private (Client)
const createSubscription = async (req, res) => {
    try {
        const { plan, billingType, value, paymentMethod } = req.body;
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado'
            });
        }
        // Verificar se o usuário é um cliente
        if (req.user.role !== userModel_1.UserRole.CLIENT) {
            return res.status(403).json({
                success: false,
                message: 'Apenas clientes podem criar assinaturas'
            });
        }
        // Buscar cliente no banco de dados
        const client = await userModel_1.Client.findById(req.user._id);
        if (!client) {
            return res.status(404).json({
                success: false,
                message: 'Cliente não encontrado'
            });
        }
        // Verificar se já existe uma assinatura ativa
        const existingSubscription = await subscriptionModel_1.default.findOne({
            user: req.user._id,
            status: subscriptionModel_1.SubscriptionStatus.ACTIVE
        });
        if (existingSubscription) {
            return res.status(400).json({
                success: false,
                message: 'Você já possui uma assinatura ativa'
            });
        }
        // Criar ou atualizar cliente no Asaas
        let asaasCustomerId = client.get('subscriptionId');
        if (!asaasCustomerId) {
            // Criar cliente no Asaas
            const customerData = {
                name: client.name,
                email: client.email,
                phone: client.phone,
                externalReference: client._id.toString()
            };
            const asaasCustomer = await asaasService_1.default.createCustomer(customerData);
            asaasCustomerId = asaasCustomer.id;
        }
        // Criar assinatura no Asaas
        const nextDueDate = new Date();
        nextDueDate.setDate(nextDueDate.getDate() + 1); // Próximo dia
        const subscriptionData = {
            customer: asaasCustomerId,
            billingType: billingType,
            value,
            nextDueDate: nextDueDate.toISOString().split('T')[0],
            cycle: 'MONTHLY',
            description: `Assinatura Supravel Connect - Plano ${plan}`
        };
        const asaasSubscription = await asaasService_1.default.createSubscription(subscriptionData);
        // Criar assinatura no banco de dados
        const subscription = await subscriptionModel_1.default.create({
            user: req.user._id,
            plan,
            status: subscriptionModel_1.SubscriptionStatus.PENDING,
            asaasSubscriptionId: asaasSubscription.id,
            startDate: new Date(),
            value,
            nextBillingDate: nextDueDate,
            billingCycle: 'MONTHLY',
            paymentMethod
        });
        // Atualizar cliente com status de assinatura
        await userModel_1.Client.findByIdAndUpdate(req.user._id, {
            subscriptionStatus: subscriptionModel_1.SubscriptionStatus.PENDING,
            subscriptionId: asaasSubscription.id
        });
        res.status(201).json({
            success: true,
            data: {
                subscription,
                paymentLink: asaasSubscription.paymentLink
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao criar assinatura'
        });
    }
};
exports.createSubscription = createSubscription;
// @desc    Obter assinatura atual do usuário
// @route   GET /api/subscriptions/current
// @access  Private (Client)
const getCurrentSubscription = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado'
            });
        }
        // Buscar assinatura mais recente do usuário
        const subscription = await subscriptionModel_1.default.findOne({
            user: req.user._id
        }).sort({ createdAt: -1 });
        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'Nenhuma assinatura encontrada'
            });
        }
        // Buscar detalhes da assinatura no Asaas
        const asaasSubscription = await asaasService_1.default.getSubscription(subscription.asaasSubscriptionId);
        res.status(200).json({
            success: true,
            data: {
                subscription,
                asaasDetails: asaasSubscription
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao obter assinatura'
        });
    }
};
exports.getCurrentSubscription = getCurrentSubscription;
// @desc    Cancelar assinatura
// @route   DELETE /api/subscriptions/:id
// @access  Private (Client)
const cancelSubscription = async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado'
            });
        }
        // Buscar assinatura
        const subscription = await subscriptionModel_1.default.findOne({
            _id: id,
            user: req.user._id
        });
        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'Assinatura não encontrada'
            });
        }
        // Cancelar assinatura no Asaas
        await asaasService_1.default.cancelSubscription(subscription.asaasSubscriptionId);
        // Atualizar status da assinatura
        subscription.status = subscriptionModel_1.SubscriptionStatus.CANCELLED;
        await subscription.save();
        // Atualizar cliente
        await userModel_1.Client.findByIdAndUpdate(req.user._id, {
            subscriptionStatus: subscriptionModel_1.SubscriptionStatus.CANCELLED
        });
        res.status(200).json({
            success: true,
            data: subscription
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao cancelar assinatura'
        });
    }
};
exports.cancelSubscription = cancelSubscription;
// @desc    Webhook para receber notificações do Asaas
// @route   POST /api/subscriptions/webhook
// @access  Public
const asaasWebhook = async (req, res) => {
    try {
        const { event, payment } = req.body;
        // Verificar tipo de evento
        if (event === 'PAYMENT_RECEIVED') {
            // Pagamento recebido, atualizar status da assinatura
            const subscription = await subscriptionModel_1.default.findOne({
                asaasSubscriptionId: payment.subscription
            });
            if (subscription) {
                subscription.status = subscriptionModel_1.SubscriptionStatus.ACTIVE;
                await subscription.save();
                // Atualizar cliente
                await userModel_1.Client.findByIdAndUpdate(subscription.user, {
                    subscriptionStatus: subscriptionModel_1.SubscriptionStatus.ACTIVE
                });
            }
        }
        else if (event === 'PAYMENT_OVERDUE') {
            // Pagamento atrasado, atualizar status da assinatura
            const subscription = await subscriptionModel_1.default.findOne({
                asaasSubscriptionId: payment.subscription
            });
            if (subscription) {
                subscription.status = subscriptionModel_1.SubscriptionStatus.INACTIVE;
                await subscription.save();
                // Atualizar cliente
                await userModel_1.Client.findByIdAndUpdate(subscription.user, {
                    subscriptionStatus: subscriptionModel_1.SubscriptionStatus.INACTIVE
                });
            }
        }
        res.status(200).json({ success: true });
    }
    catch (error) {
        console.error('Erro no webhook do Asaas:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao processar webhook'
        });
    }
};
exports.asaasWebhook = asaasWebhook;
