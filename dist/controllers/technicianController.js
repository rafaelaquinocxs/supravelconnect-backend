"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSpecialties = exports.getAllSpecialties = exports.updateAvailability = exports.getTechnicianById = exports.getAvailableTechnicians = void 0;
const userModel_1 = require("../models/userModel");
const specialtyModel_1 = __importDefault(require("../models/specialtyModel"));
// @desc    Buscar técnicos disponíveis
// @route   GET /api/technicians/available
// @access  Private (Client)
const getAvailableTechnicians = async (req, res) => {
    try {
        const { specialty } = req.query;
        // Filtros base
        const filters = {
            role: userModel_1.UserRole.TECHNICIAN,
            isActive: true,
            'isApproved': true,
            'available': true
        };
        // Adicionar filtro por especialidade se fornecido
        if (specialty) {
            filters.specialties = specialty;
        }
        // Buscar técnicos com filtros
        const technicians = await userModel_1.Technician.find(filters)
            .select('-password')
            .populate('specialties', 'name description icon');
        res.status(200).json({
            success: true,
            count: technicians.length,
            data: technicians
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao buscar técnicos disponíveis'
        });
    }
};
exports.getAvailableTechnicians = getAvailableTechnicians;
// @desc    Obter detalhes de um técnico
// @route   GET /api/technicians/:id
// @access  Private
const getTechnicianById = async (req, res) => {
    try {
        const { id } = req.params;
        const technician = await userModel_1.Technician.findOne({
            _id: id,
            role: userModel_1.UserRole.TECHNICIAN,
            isActive: true
        })
            .select('-password')
            .populate('specialties', 'name description icon');
        if (!technician) {
            return res.status(404).json({
                success: false,
                message: 'Técnico não encontrado'
            });
        }
        res.status(200).json({
            success: true,
            data: technician
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao obter detalhes do técnico'
        });
    }
};
exports.getTechnicianById = getTechnicianById;
// @desc    Atualizar disponibilidade do técnico
// @route   PUT /api/technicians/availability
// @access  Private (Technician)
const updateAvailability = async (req, res) => {
    try {
        const { available } = req.body;
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado'
            });
        }
        // Verificar se o usuário é um técnico
        if (req.user.role !== userModel_1.UserRole.TECHNICIAN) {
            return res.status(403).json({
                success: false,
                message: 'Apenas técnicos podem atualizar disponibilidade'
            });
        }
        // Atualizar disponibilidade
        const technician = await userModel_1.Technician.findByIdAndUpdate(req.user._id, { available }, { new: true }).select('-password');
        if (!technician) {
            return res.status(404).json({
                success: false,
                message: 'Técnico não encontrado'
            });
        }
        res.status(200).json({
            success: true,
            data: technician
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao atualizar disponibilidade'
        });
    }
};
exports.updateAvailability = updateAvailability;
// @desc    Listar todas as especialidades
// @route   GET /api/technicians/specialties
// @access  Public
const getAllSpecialties = async (req, res) => {
    try {
        const specialties = await specialtyModel_1.default.find({ isActive: true });
        res.status(200).json({
            success: true,
            count: specialties.length,
            data: specialties
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao listar especialidades'
        });
    }
};
exports.getAllSpecialties = getAllSpecialties;
// @desc    Atualizar especialidades do técnico
// @route   PUT /api/technicians/specialties
// @access  Private (Technician)
const updateSpecialties = async (req, res) => {
    try {
        const { specialties } = req.body;
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado'
            });
        }
        // Verificar se o usuário é um técnico
        if (req.user.role !== userModel_1.UserRole.TECHNICIAN) {
            return res.status(403).json({
                success: false,
                message: 'Apenas técnicos podem atualizar especialidades'
            });
        }
        // Verificar se as especialidades existem
        if (specialties && specialties.length > 0) {
            const validSpecialties = await specialtyModel_1.default.find({ _id: { $in: specialties }, isActive: true });
            if (validSpecialties.length !== specialties.length) {
                return res.status(400).json({
                    success: false,
                    message: 'Uma ou mais especialidades não existem ou estão inativas'
                });
            }
        }
        // Atualizar especialidades
        const technician = await userModel_1.Technician.findByIdAndUpdate(req.user._id, { specialties }, { new: true })
            .select('-password')
            .populate('specialties', 'name description icon');
        if (!technician) {
            return res.status(404).json({
                success: false,
                message: 'Técnico não encontrado'
            });
        }
        res.status(200).json({
            success: true,
            data: technician
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao atualizar especialidades'
        });
    }
};
exports.updateSpecialties = updateSpecialties;
