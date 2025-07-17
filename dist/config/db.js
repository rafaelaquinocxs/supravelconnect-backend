"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
// Carregar variáveis de ambiente
dotenv_1.default.config();
// Função para conectar ao MongoDB
const connectDB = async () => {
    try {
        const conn = await mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/supravel-connect');
        console.log(`MongoDB conectado: ${conn.connection.host}`);
    }
    catch (error) {
        console.error(`Erro ao conectar ao MongoDB: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        process.exit(1);
    }
};
exports.default = connectDB;
