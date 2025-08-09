import { Request } from 'express';
import { Document } from 'mongoose';
import { UserRole } from '../models/userModel';

// Interface para estender o Request do Express com o usuário autenticado
export interface IAuthRequest extends Request {
  user?: Document & {
    _id: string;
    name: string;
    email: string;
    role: UserRole;
    isActive: boolean;
    isApproved: boolean;
    credits: number;
    specialties?: string[];
  };
}

// Interface para o corpo da requisição de registro
export interface IRegisterRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
  company?: string;
  specialties?: string[];
  experience?: number;
  hourlyRate?: number;
  bio?: string;
  certifications?: string[];
}

// Interface para o corpo da requisição de login
export interface ILoginRequest {
  email: string;
  password: string;
}

// Interface para a resposta de autenticação
export interface IAuthResponse {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  credits?: number;
  specialties?: string[];
  isApproved?: boolean;
  profileImage?: string;
  token: string;
}

