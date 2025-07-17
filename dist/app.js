"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = __importDefault(require("./config/db"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
// Carregar variáveis de ambiente
dotenv_1.default.config();
// Conectar ao banco de dados
(0, db_1.default)();
// Inicializar Express
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: false }));
// Logging em desenvolvimento
if (process.env.NODE_ENV === 'development') {
    app.use((0, morgan_1.default)('dev'));
}
// Rotas
app.use('/api/auth', authRoutes_1.default);
// Rota básica
app.get('/', (req, res) => {
    res.json({ message: 'API Supravel Connect funcionando!' });
});
// Middleware de erro para rotas não encontradas
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint não encontrado'
    });
});
// Middleware de tratamento de erros
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});
exports.default = app;
