import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User, { UserRole, Client, Technician } from '../models/userModel';
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
    const { name, email, password, role, phone, company, specialties }: IRegisterRequest = req.body;

    // Verificar se o email já está em uso
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'Email já está em uso'
      });
    }

    // Criar usuário baseado no role
    let user;

    if (role === UserRole.TECHNICIAN) {
      // Verificar se as especialidades são válidas
      if (specialties && specialties.length > 0) {
        const invalidSpecialties = specialties.filter(spec => !VALID_SPECIALTIES.includes(spec));
        if (invalidSpecialties.length > 0) {
          return res.status(400).json({
            success: false,
            message: `Especialidades inválidas: ${invalidSpecialties.join(', ')}`
          });
        }
      }

      user = await Technician.create({
        name,
        email,
        password,
        phone,
        specialties: specialties || [],
        experience: 0, // Valor padrão
        isApproved: false // Técnicos precisam ser aprovados pelo admin
      });
    } else if (role === UserRole.CLIENT) {
      user = await Client.create({
        name,
        email,
        password,
        phone,
        company
      });
    } else {
      // Não permitir criação de admin via registro público
      return res.status(403).json({
        success: false,
        message: 'Não é possível criar conta de administrador'
      });
    }

    // Gerar token
    const token = generateToken(user._id, role);

    // Retornar dados do usuário e token
    const authResponse: IAuthResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
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

    // Se for técnico, verificar se está aprovado
    if (user.role === UserRole.TECHNICIAN) {
      const technician = await Technician.findById(user._id);
      if (technician && !technician.isApproved) {
        return res.status(401).json({
          success: false,
          message: 'Sua conta ainda não foi aprovada pelo administrador'
        });
      }
    }

    // Gerar token
    const token = generateToken(user._id, user.role as UserRole);

    // Retornar dados do usuário e token
    const authResponse: IAuthResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
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

