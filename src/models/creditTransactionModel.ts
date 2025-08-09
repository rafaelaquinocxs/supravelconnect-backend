import mongoose, { Document, Schema } from 'mongoose';

// Enums para transações
export enum TransactionType {
  PURCHASE = 'purchase',
  USAGE = 'usage',
  REFUND = 'refund',
  BONUS = 'bonus',
  EXPIRATION = 'expiration'
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  PIX = 'pix',
  BANK_SLIP = 'bank_slip'
}

// Interface da transação de créditos
export interface ICreditTransaction extends Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  type: TransactionType;
  status: TransactionStatus;
  
  // Valores
  credits: number;
  amount: number; // valor em reais
  
  // Referências
  packageId?: mongoose.Types.ObjectId;
  appointmentId?: mongoose.Types.ObjectId;
  
  // Pagamento
  paymentMethod?: PaymentMethod;
  paymentId?: string; // ID do pagamento no gateway
  paymentData?: any; // dados adicionais do pagamento
  
  // Detalhes
  description: string;
  notes?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
  expiresAt?: Date;
}

// Schema da transação de créditos
const CreditTransactionSchema: Schema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: Object.values(TransactionType),
    required: true
  },
  status: {
    type: String,
    enum: Object.values(TransactionStatus),
    default: TransactionStatus.PENDING
  },
  
  // Valores
  credits: {
    type: Number,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Referências
  packageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CreditPackage'
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  
  // Pagamento
  paymentMethod: {
    type: String,
    enum: Object.values(PaymentMethod)
  },
  paymentId: {
    type: String,
    trim: true
  },
  paymentData: {
    type: Schema.Types.Mixed
  },
  
  // Detalhes
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  // Timestamps adicionais
  processedAt: Date,
  expiresAt: Date
}, {
  timestamps: true
});

// Indexes
CreditTransactionSchema.index({ userId: 1, createdAt: -1 });
CreditTransactionSchema.index({ type: 1, status: 1 });
CreditTransactionSchema.index({ paymentId: 1 });
CreditTransactionSchema.index({ status: 1, createdAt: -1 });

const CreditTransaction = mongoose.model<ICreditTransaction>('CreditTransaction', CreditTransactionSchema);

export default CreditTransaction;

