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
exports.getRecordingUrl = exports.rateSession = exports.endSession = exports.startSession = exports.getSessionById = exports.getUserSessions = exports.createSession = void 0;
const sessionModel_1 = __importStar(require("../models/sessionModel"));
const userModel_1 = require("../models/userModel");
const webrtcService_1 = __importDefault(require("../services/webrtcService"));
// @desc    Iniciar uma nova sessão
// @route   POST /api/sessions
// @access  Private (Client)
const createSession = async (req, res) => {
    try {
        const { technicianId, specialtyId, problem, urgency } = req.body;
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
                message: 'Apenas clientes podem criar sessões'
            });
        }
        // Verificar se o cliente tem assinatura ativa
        const client = await userModel_1.Client.findById(req.user._id);
        if (!client) {
            return res.status(404).json({
                success: false,
                message: 'Cliente não encontrado'
            });
        }
        if (client.subscriptionStatus !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'Você precisa ter uma assinatura ativa para criar sessões'
            });
        }
        // Verificar se o técnico existe e está disponível
        const technician = await userModel_1.Technician.findOne({
            _id: technicianId,
            role: userModel_1.UserRole.TECHNICIAN,
            isActive: true,
            isApproved: true,
            available: true
        });
        if (!technician) {
            return res.status(404).json({
                success: false,
                message: 'Técnico não encontrado ou não disponível'
            });
        }
        // Criar sessão
        const session = await sessionModel_1.default.create({
            client: req.user._id,
            technician: technicianId,
            specialty: specialtyId,
            problem,
            urgency: urgency || false,
            status: sessionModel_1.SessionStatus.SCHEDULED
        });
        // Retornar sessão criada
        const populatedSession = await sessionModel_1.default.findById(session._id)
            .populate('client', 'name email')
            .populate('technician', 'name email')
            .populate('specialty', 'name');
        res.status(201).json({
            success: true,
            data: populatedSession
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao criar sessão'
        });
    }
};
exports.createSession = createSession;
// @desc    Obter sessões do usuário
// @route   GET /api/sessions
// @access  Private
const getUserSessions = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado'
            });
        }
        // Filtrar por status se fornecido
        const { status } = req.query;
        const filters = {};
        if (status) {
            filters.status = status;
        }
        // Filtrar por cliente ou técnico dependendo do role
        if (req.user.role === userModel_1.UserRole.CLIENT) {
            filters.client = req.user._id;
        }
        else if (req.user.role === userModel_1.UserRole.TECHNICIAN) {
            filters.technician = req.user._id;
        }
        else if (req.user.role === userModel_1.UserRole.ADMIN) {
            // Admin pode ver todas as sessões
        }
        else {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado'
            });
        }
        // Buscar sessões
        const sessions = await sessionModel_1.default.find(filters)
            .populate('client', 'name email')
            .populate('technician', 'name email')
            .populate('specialty', 'name')
            .sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: sessions.length,
            data: sessions
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao obter sessões'
        });
    }
};
exports.getUserSessions = getUserSessions;
// @desc    Obter detalhes de uma sessão
// @route   GET /api/sessions/:id
// @access  Private
const getSessionById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado'
            });
        }
        // Buscar sessão
        const session = await sessionModel_1.default.findById(id)
            .populate('client', 'name email')
            .populate('technician', 'name email')
            .populate('specialty', 'name');
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Sessão não encontrada'
            });
        }
        // Verificar permissão
        if (req.user.role !== userModel_1.UserRole.ADMIN &&
            session.client.toString() !== req.user._id &&
            session.technician.toString() !== req.user._id) {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado'
            });
        }
        res.status(200).json({
            success: true,
            data: session
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao obter detalhes da sessão'
        });
    }
};
exports.getSessionById = getSessionById;
// @desc    Iniciar uma sessão
// @route   PUT /api/sessions/:id/start
// @access  Private (Client, Technician)
const startSession = async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado'
            });
        }
        // Buscar sessão
        const session = await sessionModel_1.default.findById(id);
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Sessão não encontrada'
            });
        }
        // Verificar permissão
        if (session.client.toString() !== req.user._id &&
            session.technician.toString() !== req.user._id) {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado'
            });
        }
        // Verificar status
        if (session.status !== sessionModel_1.SessionStatus.SCHEDULED) {
            return res.status(400).json({
                success: false,
                message: `Não é possível iniciar uma sessão com status ${session.status}`
            });
        }
        // Atualizar sessão
        session.status = sessionModel_1.SessionStatus.IN_PROGRESS;
        session.startTime = new Date();
        await session.save();
        // Gerar URL para upload de gravação
        const uploadUrl = await webrtcService_1.default.generateUploadUrl(session._id.toString());
        res.status(200).json({
            success: true,
            data: {
                session,
                uploadUrl
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao iniciar sessão'
        });
    }
};
exports.startSession = startSession;
// @desc    Finalizar uma sessão
// @route   PUT /api/sessions/:id/end
// @access  Private (Client, Technician)
const endSession = async (req, res) => {
    try {
        const { id } = req.params;
        const { recordingKey, duration } = req.body;
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado'
            });
        }
        // Buscar sessão
        const session = await sessionModel_1.default.findById(id);
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Sessão não encontrada'
            });
        }
        // Verificar permissão
        if (session.client.toString() !== req.user._id &&
            session.technician.toString() !== req.user._id) {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado'
            });
        }
        // Verificar status
        if (session.status !== sessionModel_1.SessionStatus.IN_PROGRESS) {
            return res.status(400).json({
                success: false,
                message: `Não é possível finalizar uma sessão com status ${session.status}`
            });
        }
        // Calcular duração e créditos
        const endTime = new Date();
        const durationInSeconds = duration ||
            (session.startTime ? Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000) : 0);
        // Converter segundos para minutos (arredondando para cima)
        const durationInMinutes = Math.ceil(durationInSeconds / 60);
        // Atualizar sessão
        session.status = sessionModel_1.SessionStatus.COMPLETED;
        session.endTime = endTime;
        session.duration = durationInSeconds;
        session.creditsUsed = durationInMinutes;
        if (recordingKey) {
            // Salvar metadados da gravação
            await webrtcService_1.default.saveRecordingMetadata(session._id.toString(), recordingKey);
            // Configurar expiração automática
            await webrtcService_1.default.configureRecordingExpiration(recordingKey);
            session.recordingUrl = recordingKey;
        }
        await session.save();
        res.status(200).json({
            success: true,
            data: session
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao finalizar sessão'
        });
    }
};
exports.endSession = endSession;
// @desc    Avaliar uma sessão
// @route   PUT /api/sessions/:id/rate
// @access  Private (Client)
const rateSession = async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, review } = req.body;
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
                message: 'Apenas clientes podem avaliar sessões'
            });
        }
        // Buscar sessão
        const session = await sessionModel_1.default.findById(id);
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Sessão não encontrada'
            });
        }
        // Verificar se o cliente é o dono da sessão
        if (session.client.toString() !== req.user._id) {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado'
            });
        }
        // Verificar status
        if (session.status !== sessionModel_1.SessionStatus.COMPLETED) {
            return res.status(400).json({
                success: false,
                message: 'Apenas sessões concluídas podem ser avaliadas'
            });
        }
        // Atualizar sessão
        session.rating = rating;
        session.review = review;
        await session.save();
        // Atualizar rating do técnico
        const technician = await userModel_1.Technician.findById(session.technician);
        if (technician) {
            const currentRating = technician.rating || 0;
            const currentCount = technician.ratingCount || 0;
            // Calcular nova média
            const newRating = ((currentRating * currentCount) + rating) / (currentCount + 1);
            technician.rating = newRating;
            technician.ratingCount = currentCount + 1;
            await technician.save();
        }
        res.status(200).json({
            success: true,
            data: session
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao avaliar sessão'
        });
    }
};
exports.rateSession = rateSession;
// @desc    Obter URL de gravação
// @route   GET /api/sessions/:id/recording
// @access  Private (Admin)
const getRecordingUrl = async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado'
            });
        }
        // Verificar se o usuário é um admin
        if (req.user.role !== userModel_1.UserRole.ADMIN) {
            return res.status(403).json({
                success: false,
                message: 'Apenas administradores podem acessar gravações'
            });
        }
        // Buscar sessão
        const session = await sessionModel_1.default.findById(id);
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Sessão não encontrada'
            });
        }
        if (!session.recordingUrl) {
            return res.status(404).json({
                success: false,
                message: 'Gravação não encontrada para esta sessão'
            });
        }
        // Gerar URL para visualização
        const viewUrl = await webrtcService_1.default.generateViewUrl(session.recordingUrl);
        res.status(200).json({
            success: true,
            data: {
                viewUrl,
                expiresIn: '1 hora'
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao obter URL de gravação'
        });
    }
};
exports.getRecordingUrl = getRecordingUrl;
