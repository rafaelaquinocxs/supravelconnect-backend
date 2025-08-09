import mongoose, { Document, Schema } from 'mongoose';

// Enums para agendamento
export enum AppointmentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected'
}

export enum AppointmentType {
  CONSULTATION = 'consultation',
  SUPPORT = 'support',
  TRAINING = 'training',
  MAINTENANCE = 'maintenance'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

// Interface do agendamento
export interface IAppointment extends Document {
  _id: string;
  clientId: mongoose.Types.ObjectId;
  helperId: mongoose.Types.ObjectId; // Usuário que vai ajudar
  
  // Detalhes do agendamento
  title: string;
  description: string;
  type: AppointmentType;
  specialty?: string;
  
  // Agendamento
  scheduledDate: Date;
  scheduledTime: string; // formato HH:MM
  duration: number; // em minutos
  timezone?: string;
  
  // Status e pagamento
  status: AppointmentStatus;
  paymentStatus: PaymentStatus;
  
  // Valores
  hourlyRate: number;
  totalCost: number;
  creditsUsed: number;
  
  // Detalhes técnicos
  issue?: string;
  requirements?: string;
  notes?: string;
  resolution?: string;
  
  // Avaliação
  clientRating?: number;
  clientFeedback?: string;
  helperRating?: number;
  helperFeedback?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  
  // Métodos
  canBeCancelled(): boolean;
  canBeStarted(): boolean;
  calculateCost(): number;
}

// Schema do agendamento
const AppointmentSchema: Schema = new Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  helperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Detalhes
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  type: {
    type: String,
    enum: Object.values(AppointmentType),
    required: true
  },
  specialty: {
    type: String,
    enum: ['Elétrica', 'Hidráulica', 'Motor', 'Transmissão', 'Sistemas Eletrônicos', 'Manutenção Preventiva']
  },
  
  // Agendamento
  scheduledDate: {
    type: Date,
    required: true
  },
  scheduledTime: {
    type: String,
    required: true,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
  },
  duration: {
    type: Number,
    required: true,
    min: 15, // mínimo 15 minutos
    max: 480 // máximo 8 horas
  },
  timezone: {
    type: String,
    default: 'America/Sao_Paulo'
  },
  
  // Status
  status: {
    type: String,
    enum: Object.values(AppointmentStatus),
    default: AppointmentStatus.PENDING
  },
  paymentStatus: {
    type: String,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING
  },
  
  // Valores
  hourlyRate: {
    type: Number,
    required: true,
    min: 0
  },
  totalCost: {
    type: Number,
    required: true,
    min: 0
  },
  creditsUsed: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Detalhes técnicos
  issue: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  requirements: {
    type: String,
    trim: true,
    maxlength: 500
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  resolution: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  // Avaliação
  clientRating: {
    type: Number,
    min: 1,
    max: 5
  },
  clientFeedback: {
    type: String,
    trim: true,
    maxlength: 500
  },
  helperRating: {
    type: Number,
    min: 1,
    max: 5
  },
  helperFeedback: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  // Timestamps adicionais
  startedAt: Date,
  completedAt: Date
}, {
  timestamps: true
});

// Métodos do schema
AppointmentSchema.methods.canBeCancelled = function(): boolean {
  const now = new Date();
  const scheduledDateTime = new Date(this.scheduledDate);
  const [hours, minutes] = this.scheduledTime.split(':').map(Number);
  scheduledDateTime.setHours(hours, minutes, 0, 0);
  
  // Pode cancelar se ainda não começou e está pelo menos 2 horas antes
  const twoHoursBefore = new Date(scheduledDateTime.getTime() - 2 * 60 * 60 * 1000);
  
  return [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED].includes(this.status) &&
         now < twoHoursBefore;
};

AppointmentSchema.methods.canBeStarted = function(): boolean {
  const now = new Date();
  const scheduledDateTime = new Date(this.scheduledDate);
  const [hours, minutes] = this.scheduledTime.split(':').map(Number);
  scheduledDateTime.setHours(hours, minutes, 0, 0);
  
  // Pode começar 15 minutos antes do horário agendado
  const fifteenMinutesBefore = new Date(scheduledDateTime.getTime() - 15 * 60 * 1000);
  
  return this.status === AppointmentStatus.CONFIRMED &&
         now >= fifteenMinutesBefore;
};

AppointmentSchema.methods.calculateCost = function(): number {
  return (this.duration / 60) * this.hourlyRate;
};

// Middleware para calcular custo automaticamente
AppointmentSchema.pre('save', function(next) {
  if (this.isModified('duration') || this.isModified('hourlyRate')) {
    this.totalCost = this.calculateCost();
  }
  next();
});

// Indexes
AppointmentSchema.index({ clientId: 1, scheduledDate: 1 });
AppointmentSchema.index({ helperId: 1, scheduledDate: 1 });
AppointmentSchema.index({ status: 1 });
AppointmentSchema.index({ scheduledDate: 1, scheduledTime: 1 });
AppointmentSchema.index({ specialty: 1, status: 1 });

const Appointment = mongoose.model<IAppointment>('Appointment', AppointmentSchema);

export default Appointment;

