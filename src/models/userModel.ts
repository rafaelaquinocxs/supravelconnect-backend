import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin'
}

// Interface unificada do usuário
export interface IUser extends Document {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  profileImage?: string;
  isApproved: boolean;
  isActive: boolean;
  
  // Campos unificados (anteriormente de Client e Technician)
  company?: string;
  credits: number;
  subscriptionPlan?: string;
  subscriptionStatus?: 'active' | 'cancelled' | 'expired';
  
  specialties?: string[]; // Opcional para todos os usuários
  experience?: number;
  hourlyRate?: number;
  rating: number;
  totalSessions: number;
  bio?: string;
  certifications?: string[];
  availability?: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  bankInfo?: {
    bank: string;
    agency: string;
    account: string;
    accountType: 'checking' | 'savings';
    pixKey?: string;
  };
  
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Schema unificado do usuário
const UserSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.USER
  },
  phone: {
    type: String,
    trim: true,
    match: [/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos']
  },
  profileImage: {
    type: String,
    trim: true
  },
  isApproved: {
    type: Boolean,
    default: true // Todos os usuários são aprovados automaticamente
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Campos unificados
  company: {
    type: String,
    trim: true,
    maxlength: 200
  },
  credits: {
    type: Number,
    default: 0,
    min: 0
  },
  subscriptionPlan: {
    type: String,
    enum: ['basic', 'premium', 'enterprise'],
    default: 'basic'
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'cancelled', 'expired'],
    default: 'active'
  },
  
  specialties: [{
    type: String,
    enum: ['Elétrica', 'Hidráulica', 'Motor', 'Transmissão', 'Sistemas Eletrônicos', 'Manutenção Preventiva']
  }],
  experience: {
    type: Number,
    min: 0,
    max: 50
  },
  hourlyRate: {
    type: Number,
    min: 0,
    default: 80
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalSessions: {
    type: Number,
    default: 0,
    min: 0
  },
  bio: {
    type: String,
    trim: true,
    maxlength: 500
  },
  certifications: [{
    type: String,
    trim: true,
    maxlength: 100
  }],
  availability: {
    monday: { type: Boolean, default: true },
    tuesday: { type: Boolean, default: true },
    wednesday: { type: Boolean, default: true },
    thursday: { type: Boolean, default: true },
    friday: { type: Boolean, default: true },
    saturday: { type: Boolean, default: false },
    sunday: { type: Boolean, default: false }
  },
  bankInfo: {
    bank: { type: String, trim: true },
    agency: { type: String, trim: true },
    account: { type: String, trim: true },
    accountType: { 
      type: String, 
      enum: ['checking', 'savings'],
      default: 'checking'
    },
    pixKey: { type: String, trim: true }
  }
}, {
  timestamps: true
});

// Middleware para hash da senha
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Método para comparar senhas
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1, isApproved: 1 });
UserSchema.index({ specialties: 1, isApproved: 1, isActive: 1 });
UserSchema.index({ rating: -1 });

// Criar modelo unificado
const User = mongoose.model<IUser>('User', UserSchema);

export default User;

