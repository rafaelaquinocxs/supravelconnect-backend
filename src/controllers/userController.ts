import { Request, Response } from 'express';
import User from '../models/userModel';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configuração do multer para upload de imagens
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/profiles';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas'));
    }
  }
});

// @desc    Obter perfil do usuário
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user?._id).select('-password');
    
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
      message: error.message || 'Erro ao obter perfil'
    });
  }
};

// @desc    Atualizar perfil do usuário
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const updateData = req.body;

    // Remover campos que não devem ser atualizados
    delete updateData.password;
    delete updateData.email;
    delete updateData._id;
    delete updateData.role;
    delete updateData.isApproved;

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    res.status(200).json({
      success: true,
      data: user,
      message: 'Perfil atualizado com sucesso'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao atualizar perfil'
    });
  }
};

// @desc    Upload de imagem de perfil
// @route   POST /api/users/upload-image
// @access  Private
export const uploadProfileImage = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhuma imagem foi enviada'
      });
    }

    // Construir URL da imagem
    const imageUrl = `/uploads/profiles/${req.file.filename}`;

    // Atualizar usuário com nova imagem
    const user = await User.findByIdAndUpdate(
      userId,
      { profileImage: imageUrl },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        profileImage: imageUrl
      },
      message: 'Imagem atualizada com sucesso'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao fazer upload da imagem'
    });
  }
};

// @desc    Obter lista de técnicos
// @route   GET /api/users/technicians
// @access  Public
export const getTechnicians = async (req: Request, res: Response) => {
  try {
    const { 
      specialty, 
      minRating, 
      maxPrice, 
      available, 
      search,
      page = 1,
      limit = 10 
    } = req.query;

    // Construir filtros
    const filters: any = { 
      role: 'technician',
      isApproved: true 
    };

    if (specialty) {
      filters.specialties = { $in: [specialty] };
    }

    if (minRating) {
      filters.rating = { $gte: parseFloat(minRating as string) };
    }

    if (maxPrice) {
      filters.hourlyRate = { $lte: parseFloat(maxPrice as string) };
    }

    if (available === 'true') {
      filters.isAvailable = true;
    }

    if (search) {
      filters.$or = [
        { name: { $regex: search, $options: 'i' } },
        { specialties: { $in: [new RegExp(search as string, 'i')] } }
      ];
    }

    // Paginação
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const technicians = await User.find(filters)
      .select('-password -bankInfo')
      .sort({ isAvailable: -1, rating: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await User.countDocuments(filters);

    res.status(200).json({
      success: true,
      data: technicians,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao buscar técnicos'
    });
  }
};

// @desc    Obter técnico por ID
// @route   GET /api/users/technicians/:id
// @access  Public
export const getTechnicianById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const technician = await User.findOne({
      _id: id,
      role: 'technician',
      isApproved: true
    }).select('-password -bankInfo');

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
      message: error.message || 'Erro ao buscar técnico'
    });
  }
};

// @desc    Atualizar disponibilidade do técnico
// @route   PUT /api/users/availability
// @access  Private (Technician only)
export const updateAvailability = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const { isAvailable } = req.body;

    const user = await User.findById(userId);

    if (!user || user.role !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }

    // CORREÇÃO: Usar (user as any) para propriedades não definidas no modelo
    (user as any).isAvailable = isAvailable;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        isAvailable: (user as any).isAvailable || false,
      },
      message: `Status alterado para ${isAvailable ? 'disponível' : 'indisponível'}`
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao atualizar disponibilidade'
    });
  }
};

// @desc    Obter estatísticas do técnico
// @route   GET /api/users/technician-stats
// @access  Private (Technician only)
export const getTechnicianStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;

    const user = await User.findById(userId);

    if (!user || user.role !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }

    // CORREÇÃO: Simular estatísticas básicas (em produção, buscar de sessões reais)
    const stats = {
      totalSessions: 0,
      averageRating: 0,
      totalEarnings: 0,
      monthlyEarnings: 0,
      completedSessions: 0,
      averageResponseTime: 0
    };

    // CORREÇÃO: Usar (user as any) para propriedades não definidas no modelo
    (user as any).totalSessions = stats.totalSessions || 0;
    (user as any).rating = stats.averageRating || 0;
    (user as any).totalEarnings = stats.totalEarnings || 0;
    (user as any).monthlyEarnings = stats.monthlyEarnings || 0;
    (user as any).completedSessions = stats.completedSessions || 0;
    (user as any).averageResponseTime = stats.averageResponseTime || 0;

    await user.save();

    const responseStats = {
      totalSessions: (user as any).totalSessions || 0,
      rating: (user as any).rating || 0,
      totalEarnings: (user as any).totalEarnings || 0,
      monthlyEarnings: (user as any).monthlyEarnings || 0,
      completedSessions: (user as any).completedSessions || 0,
      averageResponseTime: (user as any).averageResponseTime || 0
    };

    res.status(200).json({
      success: true,
      data: responseStats
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao obter estatísticas'
    });
  }
};

// Middleware para upload de imagem
export const uploadMiddleware = upload.single('profileImage');
