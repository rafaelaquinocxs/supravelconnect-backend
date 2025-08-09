// src/types/index.ts - Versão final corrigida

import { Request, Response, NextFunction } from 'express';

// Enum para status de sessão
export enum SessionStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  ACTIVE = 'active',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected'
}

// Interface para Request autenticado
export interface AuthRequest extends Request {
  user?: any; // Usar any para evitar conflitos
}

export interface IAuthRequest extends Request {
  user?: any; // Usar any para evitar conflitos
}

// Extensão global do Express Request
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Tipos para subscription plans
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  credits?: number;
  commission?: number;
  features: string[];
  isPopular?: boolean;
}

// Extensões opcionais para models (usando any para evitar conflitos)
export interface UserExtensions {
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  autoRenew?: boolean;
  cancellationReason?: string;
  cancellationDate?: Date;
  paymentMethod?: string;
  credits?: number;
  hourlyRate?: number;
  isAvailable?: boolean;
  totalSessions?: number;
  rating?: number;
  totalEarnings?: number;
  monthlyEarnings?: number;
  completedSessions?: number;
  averageResponseTime?: number;
  isVerified?: boolean;
}

export interface SessionExtensions {
  client?: any;
  technician?: any;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  creditsUsed?: number;
  clientRating?: number;
  clientFeedback?: string;
  notes?: string;
  resolution?: string;
  canStart?(): boolean;
  startSession?(): Promise<void>;
  endSession?(): Promise<void>;
  canBeCancelled?(): boolean;
  addRating?(rating: number, comment?: string): Promise<void>;
}

// Tipos para middleware de autenticação - CORRIGIDO
export interface AuthMiddleware {
  (req: Request, res: Response, next: NextFunction): void;
}

// Tipos para resposta da API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Tipos para paginação
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    current: number;
    pages: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
