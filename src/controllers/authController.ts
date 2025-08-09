import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User, { UserRole } from '../models/userModel';
import { IRegisterRequest, ILoginRequest, IAuthResponse } from '../interfaces/authInterface';

// Especialidades válidas
const VALID_SPECIALTIES = [
  'Elétrica',
  'Hidráulica', 
  'Motor',
  'Transmissão',
  'Sistemas Eletrônicos',
  'Manutenção Preventiva'
];

// Gerar token JWT
const generateToken = (id: string, role: UserRole): string => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'supravel_secret', {
    expiresIn: '30d'
  });
};

// @desc    Registrar um novo usuário
// @route   POST /api/auth/register
// @access  Public
export const register = async (req: Request, res: Response) => {
  try {
    const { 
      name, 
      email, 
      password, 
      phone, 
      company, 
      specialties,
      experience,
      hourlyRate,
      bio,
      certifications
    }: IRegisterRequest = req.body;

    // Verificar se o email já está em uso
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'Email já está em uso'
      });
    }

    // Verificar se as especialidades são válidas (se fornecidas)
    if (specialties && specialties.length > 0) {
      const invalidSpecialties = specialties.filter(spec => !VALID_SPECIALTIES.includes(spec));
      if (invalidSpecialties.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Especialidades inválidas: ${invalidSpecialties.join(', ')}`
        });
      }
    }

    // Criar usuário unificado
    const userData: any = {
      name,
      email,
      password,
      phone,
      role: UserRole.USER, // Todos são usuários por padrão
      isApproved: true // Todos são aprovados automaticamente
    };

    // Adicionar campos opcionais se fornecidos
    if (company) userData.company = company;
    if (specialties) userData.specialties = specialties;
    if (experience !== undefined) userData.experience = experience;
    if (hourlyRate !== undefined) userData.hourlyRate = hourlyRate;
    if (bio) userData.bio = bio;
    if (certifications) userData.certifications = certifications;

    const user = await User.create(userData);

    // Gerar token
    const token = generateToken(user._id, user.role);

    // Retornar dados do usuário e token
    const authResponse: IAuthResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      credits: user.credits,
      specialties: user.specialties,
      isApproved: user.isApproved,
      profileImage: user.profileImage,
      token
    };

    res.status(201).json({
      success: true,
      data: authResponse
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao registrar usuário'
    });
  }
};

// @desc    Login de usuário
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password }: ILoginRequest = req.body;

    // Verificar se o email existe
    const user = await User.findOne({ email });
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

    // Gerar token
    const token = generateToken(user._id, user.role);

    // Retornar dados do usuário e token
    const authResponse: IAuthResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      credits: user.credits,
      specialties: user.specialties,
      isApproved: user.isApproved,
      profileImage: user.profileImage,
      token
    };

    res.status(200).json({
      success: true,
      data: authResponse
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao fazer login'
    });
  }
};

// @desc    Obter perfil do usuário atual
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req: Request, res: Response) => {
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

// @desc    Atualizar perfil do usuário atual
// @route   PUT /api/auth/me
// @access  Private
export const updateMe = async (req: Request, res: Response) => {
  try {
    const {
      name,
      phone,
      company,
      specialties,
      experience,
      hourlyRate,
      bio,
      certifications,
      availability,
      bankInfo
    } = req.body;

    // Verificar se as especialidades são válidas (se fornecidas)
    if (specialties && specialties.length > 0) {
      const invalidSpecialties = specialties.filter(spec => !VALID_SPECIALTIES.includes(spec));
      if (invalidSpecialties.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Especialidades inválidas: ${invalidSpecialties.join(', ')}`
        });
      }
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (company) updateData.company = company;
    if (specialties) updateData.specialties = specialties;
    if (experience !== undefined) updateData.experience = experience;
    if (hourlyRate !== undefined) updateData.hourlyRate = hourlyRate;
    if (bio) updateData.bio = bio;
    if (certifications) updateData.certifications = certifications;
    if (availability) updateData.availability = availability;
    if (bankInfo) updateData.bankInfo = bankInfo;

    const user = await User.findByIdAndUpdate(
      req.user?._id,
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
      data: user
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao atualizar perfil'
    });
  }
};

