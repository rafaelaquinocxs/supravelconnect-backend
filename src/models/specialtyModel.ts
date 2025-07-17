import mongoose, { Document, Schema } from 'mongoose';

export interface ISpecialty extends Document {
  name: string;
  description?: string;
  icon?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const specialtySchema = new Schema<ISpecialty>({
  name: {
    type: String,
    required: [true, 'Nome da especialidade é obrigatório'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  icon: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Specialty = mongoose.model<ISpecialty>('Specialty', specialtySchema);

export default Specialty;
