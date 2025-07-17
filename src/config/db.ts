import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Carregar variáveis de ambiente
dotenv.config();

// Função para conectar ao MongoDB
const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/supravel-connect');
    
    console.log(`MongoDB conectado: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Erro ao conectar ao MongoDB: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    process.exit(1);
  }
};

export default connectDB;
