import mongoose, { Document, Schema } from 'mongoose';

// Enums
export enum SessionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected'
}

export enum SessionUrgency {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

// Interfaces
export interface ISession extends Document {
  _id: string;
  clientId: mongoose.Types.ObjectId;
  technicianId: mongoose.Types.ObjectId;
  
  // Session Details
  title: string;
  description: string;
  specialty: string;
  urgency: SessionUrgency;
  
  // Scheduling
  scheduledDate: Date;
  scheduledTime: string;
  estimatedDuration: number; // em minutos
  actualDuration?: number; // em minutos
  
  // Status
  status: SessionStatus;
  
  // Technical Details
  issue: string;
  resolution?: string;
  notes?: string;
  
  // Financial
  hourlyRate: number;
  estimatedCost: number;
  actualCost?: number;
  paymentStatus: PaymentStatus;
  paymentId?: string;
  
  // Session Data
  sessionStartTime?: Date;
  sessionEndTime?: Date;
  recordingUrl?: string;
  chatHistory?: Array<{
    sender: 'client' | 'technician';
    message: string;
    timestamp: Date;
  }>;
  
  // Feedback
  clientRating?: number;
  clientFeedback?: string;
  technicianFeedback?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Schema
const SessionSchema: Schema = new Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  technicianId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Session Details
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
    maxlength: 2000
  },
  specialty: {
    type: String,
    required: true,
    enum: ['Elétrica', 'Hidráulica', 'Motor', 'Transmissão', 'Sistemas Eletrônicos', 'Manutenção Preventiva']
  },
  urgency: {
    type: String,
    enum: Object.values(SessionUrgency),
    default: SessionUrgency.MEDIUM
  },
  
  // Scheduling
  scheduledDate: {
    type: Date,
    required: true
  },
  scheduledTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  estimatedDuration: {
    type: Number,
    required: true,
    min: 15,
    max: 480 // máximo 8 horas
  },
  actualDuration: {
    type: Number,
    min: 0
  },
  
  // Status
  status: {
    type: String,
    enum: Object.values(SessionStatus),
    default: SessionStatus.PENDING
  },
  
  // Technical Details
  issue: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  resolution: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  // Financial
  hourlyRate: {
    type: Number,
    required: true,
    min: 0
  },
  estimatedCost: {
    type: Number,
    required: true,
    min: 0
  },
  actualCost: {
    type: Number,
    min: 0
  },
  paymentStatus: {
    type: String,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING
  },
  paymentId: {
    type: String,
    trim: true
  },
  
  // Session Data
  sessionStartTime: {
    type: Date
  },
  sessionEndTime: {
    type: Date
  },
  recordingUrl: {
    type: String,
    trim: true
  },
  chatHistory: [{
    sender: {
      type: String,
      enum: ['client', 'technician'],
      required: true
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Feedback
  clientRating: {
    type: Number,
    min: 1,
    max: 5
  },
  clientFeedback: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  technicianFeedback: {
    type: String,
    trim: true,
    maxlength: 1000
  }
}, {
  timestamps: true
});

// Indexes
SessionSchema.index({ clientId: 1, createdAt: -1 });
SessionSchema.index({ technicianId: 1, createdAt: -1 });
SessionSchema.index({ status: 1, scheduledDate: 1 });
SessionSchema.index({ scheduledDate: 1, scheduledTime: 1 });

// Virtual para calcular duração total
SessionSchema.virtual('totalDuration').get(function() {
  if (this.sessionStartTime && this.sessionEndTime) {
    return Math.round((this.sessionEndTime.getTime() - this.sessionStartTime.getTime()) / (1000 * 60));
  }
  return this.actualDuration || this.estimatedDuration;
});

// Virtual para verificar se a sessão está atrasada
SessionSchema.virtual('isOverdue').get(function() {
  if (this.status === SessionStatus.PENDING || this.status === SessionStatus.CONFIRMED) {
    const scheduledDateTime = new Date(this.scheduledDate);
    const [hours, minutes] = this.scheduledTime.split(':').map(Number);
    scheduledDateTime.setHours(hours, minutes, 0, 0);
    
    return new Date() > scheduledDateTime;
  }
  return false;
});

// Middleware para calcular custo real
SessionSchema.pre('save', function(next) {
  if (this.isModified('actualDuration') && this.actualDuration) {
    this.actualCost = (this.actualDuration / 60) * this.hourlyRate;
  }
  next();
});

// Métodos estáticos
SessionSchema.statics.findByTechnician = function(technicianId: string, status?: SessionStatus) {
  const query: any = { technicianId };
  if (status) query.status = status;
  
  return this.find(query)
    .populate('clientId', 'name email profileImage')
    .sort({ scheduledDate: -1, scheduledTime: -1 });
};

SessionSchema.statics.findByClient = function(clientId: string, status?: SessionStatus) {
  const query: any = { clientId };
  if (status) query.status = status;
  
  return this.find(query)
    .populate('technicianId', 'name email profileImage specialties rating')
    .sort({ scheduledDate: -1, scheduledTime: -1 });
};

SessionSchema.statics.findUpcoming = function(technicianId?: string) {
  const query: any = {
    status: { $in: [SessionStatus.CONFIRMED, SessionStatus.PENDING] },
    scheduledDate: { $gte: new Date() }
  };
  
  if (technicianId) query.technicianId = technicianId;
  
  return this.find(query)
    .populate('clientId technicianId', 'name email profileImage specialties')
    .sort({ scheduledDate: 1, scheduledTime: 1 });
};

SessionSchema.statics.findActive = function(technicianId?: string) {
  const query: any = { status: SessionStatus.IN_PROGRESS };
  if (technicianId) query.technicianId = technicianId;
  
  return this.find(query)
    .populate('clientId technicianId', 'name email profileImage specialties');
};

SessionSchema.statics.getStatsByTechnician = function(technicianId: string, startDate?: Date, endDate?: Date) {
  const matchStage: any = { technicianId: new mongoose.Types.ObjectId(technicianId) };
  
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = startDate;
    if (endDate) matchStage.createdAt.$lte = endDate;
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        completedSessions: {
          $sum: { $cond: [{ $eq: ['$status', SessionStatus.COMPLETED] }, 1, 0] }
        },
        totalEarnings: {
          $sum: { $cond: [{ $eq: ['$paymentStatus', PaymentStatus.PAID] }, '$actualCost', 0] }
        },
        averageRating: { $avg: '$clientRating' },
        totalDuration: { $sum: '$actualDuration' }
      }
    }
  ]);
};

// Métodos de instância
SessionSchema.methods.canBeModified = function() {
  return [SessionStatus.PENDING, SessionStatus.CONFIRMED].includes(this.status);
};

SessionSchema.methods.canBeCancelled = function() {
  return [SessionStatus.PENDING, SessionStatus.CONFIRMED].includes(this.status);
};

SessionSchema.methods.canStart = function() {
  return this.status === SessionStatus.CONFIRMED;
};

SessionSchema.methods.startSession = function() {
  this.status = SessionStatus.IN_PROGRESS;
  this.sessionStartTime = new Date();
  return this.save();
};

SessionSchema.methods.endSession = function(resolution?: string, notes?: string) {
  this.status = SessionStatus.COMPLETED;
  this.sessionEndTime = new Date();
  
  if (resolution) this.resolution = resolution;
  if (notes) this.notes = notes;
  
  // Calcular duração real
  if (this.sessionStartTime) {
    this.actualDuration = Math.round(
      (this.sessionEndTime.getTime() - this.sessionStartTime.getTime()) / (1000 * 60)
    );
  }
  
  return this.save();
};

SessionSchema.methods.addChatMessage = function(sender: 'client' | 'technician', message: string) {
  this.chatHistory.push({
    sender,
    message,
    timestamp: new Date()
  });
  return this.save();
};

SessionSchema.methods.addRating = function(rating: number, feedback?: string) {
  this.clientRating = rating;
  if (feedback) this.clientFeedback = feedback;
  return this.save();
};

export default mongoose.model<ISession>('Session', SessionSchema);

