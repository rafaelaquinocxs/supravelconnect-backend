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
    isVerified: boolean;
  };
}

// Interface para o corpo da requisição de registro
export interface IRegisterRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  company?: string;
  specialties?: string[];
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
  token: string;
}
