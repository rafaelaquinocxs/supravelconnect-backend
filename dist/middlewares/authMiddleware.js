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
exports.client = exports.technician = exports.admin = exports.authorize = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const userModel_1 = __importStar(require("../models/userModel"));
// Middleware para proteger rotas (requer autenticação)
const protect = async (req, res, next) => {
    let token;
    // Verificar se o token está no header Authorization
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    // Se não houver token, retornar erro
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Não autorizado, token não fornecido'
        });
    }
    try {
        // Verificar token
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'supravel_secret');
        // Buscar usuário pelo ID
        const user = await userModel_1.default.findById(decoded.id).select('-password');
        // Se usuário não existir, retornar erro
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Não autorizado, usuário não encontrado'
            });
        }
        // Se usuário não estiver ativo, retornar erro
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Conta desativada, entre em contato com o suporte'
            });
        }
        // Adicionar usuário ao request
        req.user = user;
        next();
    }
    catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Não autorizado, token inválido'
        });
    }
};
exports.protect = protect;
// Middleware para restringir acesso por role
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Não autorizado, usuário não autenticado'
            });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Acesso negado, role ${req.user.role} não tem permissão`
            });
        }
        next();
    };
};
exports.authorize = authorize;
// Middleware para verificar se é admin
const admin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Não autorizado, usuário não autenticado'
        });
    }
    if (req.user.role !== userModel_1.UserRole.ADMIN) {
        return res.status(403).json({
            success: false,
            message: 'Acesso negado, apenas administradores têm permissão'
        });
    }
    next();
};
exports.admin = admin;
// Middleware para verificar se é técnico
const technician = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Não autorizado, usuário não autenticado'
        });
    }
    if (req.user.role !== userModel_1.UserRole.TECHNICIAN) {
        return res.status(403).json({
            success: false,
            message: 'Acesso negado, apenas técnicos têm permissão'
        });
    }
    next();
};
exports.technician = technician;
// Middleware para verificar se é cliente
const client = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Não autorizado, usuário não autenticado'
        });
    }
    if (req.user.role !== userModel_1.UserRole.CLIENT) {
        return res.status(403).json({
            success: false,
            message: 'Acesso negado, apenas clientes têm permissão'
        });
    }
    next();
};
exports.client = client;
