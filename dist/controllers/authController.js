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
exports.getMe = exports.login = exports.register = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const userModel_1 = __importStar(require("../models/userModel"));
const specialtyModel_1 = __importDefault(require("../models/specialtyModel"));
// Gerar token JWT
const generateToken = (id, role) => {
    return jsonwebtoken_1.default.sign({ id, role }, process.env.JWT_SECRET || 'supravel_secret', {
        expiresIn: '30d'
    });
};
// @desc    Registrar um novo usuário
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
    try {
        const { name, email, password, role, phone, company, specialties } = req.body;
        // Verificar se o email já está em uso
        const userExists = await userModel_1.default.findOne({ email });
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: 'Email já está em uso'
            });
        }
        // Criar usuário baseado no role
        let user;
        if (role === userModel_1.UserRole.TECHNICIAN) {
            // Verificar se as especialidades existem
            if (specialties && specialties.length > 0) {
                const validSpecialties = await specialtyModel_1.default.find({ _id: { $in: specialties } });
                if (validSpecialties.length !== specialties.length) {
                    return res.status(400).json({
                        success: false,
                        message: 'Uma ou mais especialidades não existem'
                    });
                }
            }
            user = await userModel_1.Technician.create({
                name,
                email,
                password,
                phone,
                specialties: specialties || [],
                isApproved: false // Técnicos precisam ser aprovados pelo admin
            });
        }
        else if (role === userModel_1.UserRole.CLIENT) {
            user = await userModel_1.Client.create({
                name,
                email,
                password,
                phone,
                company
            });
        }
        else {
            // Não permitir criação de admin via registro público
            return res.status(403).json({
                success: false,
                message: 'Não é possível criar conta de administrador'
            });
        }
        // Gerar token
        const token = generateToken(user._id, role);
        // Retornar dados do usuário e token
        const authResponse = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token
        };
        res.status(201).json({
            success: true,
            data: authResponse
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao registrar usuário'
        });
    }
};
exports.register = register;
// @desc    Login de usuário
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        // Verificar se o email existe
        const user = await userModel_1.default.findOne({ email });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Email ou senha inválidos'
            });
        }
        // Verificar se a senha está correta
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Email ou senha inválidos'
            });
        }
        // Verificar se o usuário está ativo
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Conta desativada, entre em contato com o suporte'
            });
        }
        // Se for técnico, verificar se está aprovado
        if (user.role === userModel_1.UserRole.TECHNICIAN) {
            const technician = await userModel_1.Technician.findById(user._id);
            if (technician && !technician.isApproved) {
                return res.status(401).json({
                    success: false,
                    message: 'Sua conta ainda não foi aprovada pelo administrador'
                });
            }
        }
        // Gerar token
        const token = generateToken(user._id, user.role);
        // Retornar dados do usuário e token
        const authResponse = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token
        };
        res.status(200).json({
            success: true,
            data: authResponse
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao fazer login'
        });
    }
};
exports.login = login;
// @desc    Obter perfil do usuário atual
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    var _a;
    try {
        const user = await userModel_1.default.findById((_a = req.user) === null || _a === void 0 ? void 0 : _a._id).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }
        res.status(200).json({
            success: true,
            data: user
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao obter perfil'
        });
    }
};
exports.getMe = getMe;
