// src/types/express.d.ts
import { IUser } from '../models/userModel';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

// src/types/auth.ts
import { Request } from 'express';
import { IUser } from '../models/userModel';

export interface AuthRequest extends Request {
  user: IUser;
}

export interface IAuthRequest extends Request {
  user: IUser;
}

// src/types/session.ts
export enum SessionStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// Extensões para os models existentes
declare module '../models/userModel' {
  interface IUser {
    // Propriedades de subscription
    subscriptionPlan?: string;
    subscriptionStatus?: string;
    subscriptionStartDate?: Date;
    subscriptionEndDate?: Date;
    autoRenew?: boolean;
    cancellationReason?: string;
    cancellationDate?: Date;
    paymentMethod?: string;
    credits?: number;
    
    // Propriedades de técnico
    hourlyRate?: number;
    isAvailable?: boolean;
    totalSessions?: number;
    rating?: number;
    totalEarnings?: number;
    monthlyEarnings?: number;
    completedSessions?: number;
    averageResponseTime?: number;
  }
}

declare module '../models/sessionModel' {
  interface ISession {
    // Propriedades de sessão
    client?: any;
    technician?: any;
    startTime?: Date;
    endTime?: Date;
    duration?: number;
    creditsUsed?: number;
    
    // Métodos
    canStart?(): boolean;
    startSession?(): Promise<void>;
    endSession?(): Promise<void>;
    canBeCancelled?(): boolean;
    addRating?(rating: number, comment?: string): Promise<void>;
  }
  
  interface ISessionModel {
    getStatsByTechnician?(technicianId: string): Promise<any>;
  }
}
