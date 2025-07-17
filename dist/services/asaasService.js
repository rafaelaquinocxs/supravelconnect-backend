"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
class AsaasService {
    constructor() {
        this.config = {
            apiKey: process.env.ASAAS_API_KEY || '',
            baseUrl: process.env.ASAAS_BASE_URL || 'https://sandbox.asaas.com/api/v3'
        };
        this.api = axios_1.default.create({
            baseURL: this.config.baseUrl,
            headers: {
                'Content-Type': 'application/json',
                'access_token': this.config.apiKey
            }
        });
    }
    // Criar um cliente no Asaas
    async createCustomer(customerData) {
        var _a, _b, _c, _d, _e;
        try {
            const response = await this.api.post('/customers', customerData);
            return response.data;
        }
        catch (error) {
            console.error('Erro ao criar cliente no Asaas:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
            throw new Error(((_e = (_d = (_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.errors) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.description) || 'Erro ao criar cliente no Asaas');
        }
    }
    // Obter um cliente do Asaas
    async getCustomer(customerId) {
        var _a, _b, _c, _d, _e;
        try {
            const response = await this.api.get(`/customers/${customerId}`);
            return response.data;
        }
        catch (error) {
            console.error('Erro ao obter cliente do Asaas:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
            throw new Error(((_e = (_d = (_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.errors) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.description) || 'Erro ao obter cliente do Asaas');
        }
    }
    // Atualizar um cliente no Asaas
    async updateCustomer(customerId, customerData) {
        var _a, _b, _c, _d, _e;
        try {
            const response = await this.api.post(`/customers/${customerId}`, customerData);
            return response.data;
        }
        catch (error) {
            console.error('Erro ao atualizar cliente no Asaas:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
            throw new Error(((_e = (_d = (_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.errors) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.description) || 'Erro ao atualizar cliente no Asaas');
        }
    }
    // Criar uma assinatura no Asaas
    async createSubscription(subscriptionData) {
        var _a, _b, _c, _d, _e;
        try {
            const response = await this.api.post('/subscriptions', subscriptionData);
            return response.data;
        }
        catch (error) {
            console.error('Erro ao criar assinatura no Asaas:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
            throw new Error(((_e = (_d = (_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.errors) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.description) || 'Erro ao criar assinatura no Asaas');
        }
    }
    // Obter uma assinatura do Asaas
    async getSubscription(subscriptionId) {
        var _a, _b, _c, _d, _e;
        try {
            const response = await this.api.get(`/subscriptions/${subscriptionId}`);
            return response.data;
        }
        catch (error) {
            console.error('Erro ao obter assinatura do Asaas:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
            throw new Error(((_e = (_d = (_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.errors) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.description) || 'Erro ao obter assinatura do Asaas');
        }
    }
    // Cancelar uma assinatura no Asaas
    async cancelSubscription(subscriptionId) {
        var _a, _b, _c, _d, _e;
        try {
            const response = await this.api.delete(`/subscriptions/${subscriptionId}`);
            return response.data;
        }
        catch (error) {
            console.error('Erro ao cancelar assinatura no Asaas:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
            throw new Error(((_e = (_d = (_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.errors) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.description) || 'Erro ao cancelar assinatura no Asaas');
        }
    }
    // Listar assinaturas de um cliente
    async listCustomerSubscriptions(customerId) {
        var _a, _b, _c, _d, _e;
        try {
            const response = await this.api.get('/subscriptions', {
                params: {
                    customer: customerId
                }
            });
            return response.data.data;
        }
        catch (error) {
            console.error('Erro ao listar assinaturas do cliente no Asaas:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
            throw new Error(((_e = (_d = (_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.errors) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.description) || 'Erro ao listar assinaturas do cliente no Asaas');
        }
    }
}
exports.default = new AsaasService();
