"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const PORT = process.env.PORT || 5000;
// Iniciar servidor
app_1.default.listen(PORT, () => {
    console.log(`Servidor rodando em modo ${process.env.NODE_ENV || 'development'} na porta ${PORT}`);
});
