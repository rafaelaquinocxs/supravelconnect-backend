import mongoose, { Document, Schema } from 'mongoose';

// Interface do pacote de créditos
export interface ICreditPackage extends Document {
  _id: string;
  name: string;
  description: string;
  credits: number;
  price: number; // em reais
  discount: number; // percentual de desconto
  isActive: boolean;
  isPopular: boolean;
  features: string[];
  validityDays?: number; // validade dos créditos em dias (opcional)
  createdAt: Date;
  updatedAt: Date;
}

// Schema do pacote de créditos
const CreditPackageSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  credits: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  features: [{
    type: String,
    trim: true,
    maxlength: 200
  }],
  validityDays: {
    type: Number,
    min: 1
  }
}, {
  timestamps: true
});

// Indexes
CreditPackageSchema.index({ isActive: 1, price: 1 });
CreditPackageSchema.index({ credits: 1 });

const CreditPackage = mongoose.model<ICreditPackage>('CreditPackage', CreditPackageSchema);

export default CreditPackage;

