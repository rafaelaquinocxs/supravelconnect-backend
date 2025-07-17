import { Request, Response } from 'express';
import User, { UserRole, Technician } from '../models/userModel';
import Specialty from '../models/specialtyModel';
import { IAuthRequest } from '../interfaces/authInterface';

// @desc    Buscar técnicos disponíveis
// @route   GET /api/technicians/available
// @access  Private (Client)
export const getAvailableTechnicians = async (req: IAuthRequest, res: Response) => {
  try {
    const { specialty } = req.query;

    // Filtros base
    const filters: any = {
      role: UserRole.TECHNICIAN,
      isActive: true,
      'isApproved': true,
      'available': true
    };

    // Adicionar filtro por especialidade se fornecido
    if (specialty) {
      filters.specialties = specialty;
    }

    // Buscar técnicos com filtros
    const technicians = await Technician.find(filters)
      .select('-password')
      .populate('specialties', 'name description icon');

    res.status(200).json({
      success: true,
      count: technicians.length,
      data: technicians
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao buscar técnicos disponíveis'
    });
  }
};

// @desc    Obter detalhes de um técnico
// @route   GET /api/technicians/:id
// @access  Private
export const getTechnicianById = async (req: IAuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const technician = await Technician.findOne({
      _id: id,
      role: UserRole.TECHNICIAN,
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao obter detalhes do técnico'
    });
  }
};

// @desc    Atualizar disponibilidade do técnico
// @route   PUT /api/technicians/availability
// @access  Private (Technician)
export const updateAvailability = async (req: IAuthRequest, res: Response) => {
  try {
    const { available } = req.body;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    // Verificar se o usuário é um técnico
    if (req.user.role !== UserRole.TECHNICIAN) {
      return res.status(403).json({
        success: false,
        message: 'Apenas técnicos podem atualizar disponibilidade'
      });
    }

    // Atualizar disponibilidade
    const technician = await Technician.findByIdAndUpdate(
      req.user._id,
      { available },
      { new: true }
    ).select('-password');

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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao atualizar disponibilidade'
    });
  }
};

// @desc    Listar todas as especialidades
// @route   GET /api/technicians/specialties
// @access  Public
export const getAllSpecialties = async (req: Request, res: Response) => {
  try {
    const specialties = await Specialty.find({ isActive: true });

    res.status(200).json({
      success: true,
      count: specialties.length,
      data: specialties
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao listar especialidades'
    });
  }
};

// @desc    Atualizar especialidades do técnico
// @route   PUT /api/technicians/specialties
// @access  Private (Technician)
export const updateSpecialties = async (req: IAuthRequest, res: Response) => {
  try {
    const { specialties } = req.body;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    // Verificar se o usuário é um técnico
    if (req.user.role !== UserRole.TECHNICIAN) {
      return res.status(403).json({
        success: false,
        message: 'Apenas técnicos podem atualizar especialidades'
      });
    }

    // Verificar se as especialidades existem
    if (specialties && specialties.length > 0) {
      const validSpecialties = await Specialty.find({ _id: { $in: specialties }, isActive: true });
      if (validSpecialties.length !== specialties.length) {
        return res.status(400).json({
          success: false,
          message: 'Uma ou mais especialidades não existem ou estão inativas'
        });
      }
    }

    // Atualizar especialidades
    const technician = await Technician.findByIdAndUpdate(
      req.user._id,
      { specialties },
      { new: true }
    )
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao atualizar especialidades'
    });
  }
};
