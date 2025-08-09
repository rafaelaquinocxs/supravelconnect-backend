import { Request, Response } from 'express';
import User, { UserRole } from '../models/userModel';
import { IAuthRequest } from '../interfaces/authInterface';

// @desc    Buscar usuários disponíveis para ajuda (antigos técnicos)
// @route   GET /api/users/available
// @access  Private
export const getAvailableUsers = async (req: IAuthRequest, res: Response) => {
  try {
    const { specialty } = req.query;

    // Filtros base - buscar usuários que têm especialidades (podem ajudar)
    const filters: any = {
      role: UserRole.USER,
      isActive: true,
      isApproved: true,
      specialties: { $exists: true, $ne: [] } // Tem pelo menos uma especialidade
    };

    // Adicionar filtro por especialidade se fornecido
    if (specialty) {
      filters.specialties = specialty;
    }

    // Buscar usuários com filtros
    const users = await User.find(filters)
      .select('-password -bankInfo') // Não retornar dados sensíveis
      .sort({ rating: -1, totalSessions: -1 }); // Ordenar por rating e experiência

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao buscar usuários disponíveis'
    });
  }
};

// @desc    Obter perfil de um usuário específico
// @route   GET /api/users/:id
// @access  Private
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select('-password -bankInfo'); // Não retornar dados sensíveis

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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao buscar perfil do usuário'
    });
  }
};

// @desc    Buscar usuários por especialidade
// @route   GET /api/users/specialty/:specialty
// @access  Private
export const getUsersBySpecialty = async (req: Request, res: Response) => {
  try {
    const { specialty } = req.params;

    const users = await User.find({
      role: UserRole.USER,
      isActive: true,
      isApproved: true,
      specialties: specialty
    })
    .select('-password -bankInfo')
    .sort({ rating: -1, totalSessions: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao buscar usuários por especialidade'
    });
  }
};

// @desc    Atualizar rating de um usuário
// @route   PUT /api/users/:id/rating
// @access  Private
export const updateUserRating = async (req: IAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating deve ser entre 1 e 5'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Calcular novo rating (média simples por enquanto)
    const newTotalSessions = user.totalSessions + 1;
    const newRating = ((user.rating * user.totalSessions) + rating) / newTotalSessions;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        rating: Math.round(newRating * 10) / 10, // Arredondar para 1 casa decimal
        totalSessions: newTotalSessions
      },
      { new: true }
    ).select('-password -bankInfo');

    res.status(200).json({
      success: true,
      data: updatedUser
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao atualizar rating'
    });
  }
};

