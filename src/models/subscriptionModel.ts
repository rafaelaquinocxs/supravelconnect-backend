import mongoose, { Document, Schema } from 'mongoose';

export enum SubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  CANCELLED = 'cancelled'
}

export interface ISubscription extends Document {
  user: mongoose.Types.ObjectId;
  plan: string;
  status: SubscriptionStatus;
  asaasSubscriptionId: string;
  startDate: Date;
  endDate?: Date;
  value: number;
  nextBillingDate?: Date;
  billingCycle: string;
  paymentMethod: string;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  plan: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: Object.values(SubscriptionStatus),
    default: SubscriptionStatus.PENDING
  },
  asaasSubscriptionId: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  value: {
    type: Number,
    required: true
  },
  nextBillingDate: {
    type: Date
  },
  billingCycle: {
    type: String,
    required: true,
    enum: ['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMIANNUALLY', 'YEARLY']
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['BOLETO', 'CREDIT_CARD', 'PIX']
  }
}, {
  timestamps: true
});

const Subscription = mongoose.model<ISubscription>('Subscription', subscriptionSchema);

export default Subscription;
