import axios from 'axios';

// Interface para configuração do Asaas
interface AsaasConfig {
  apiKey: string;
  baseUrl: string;
}

// Interface para criação de cliente no Asaas
export interface IAsaasCustomer {
  name: string;
  email: string;
  phone?: string;
  mobilePhone?: string;
  cpfCnpj?: string;
  postalCode?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  externalReference?: string;
  notificationDisabled?: boolean;
  additionalEmails?: string;
  municipalInscription?: string;
  stateInscription?: string;
  observations?: string;
}

// Interface para criação de assinatura no Asaas
export interface IAsaasSubscription {
  customer: string;
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX';
  value: number;
  nextDueDate: string;
  discount?: {
    value: number;
    dueDateLimitDays: number;
    type: 'FIXED' | 'PERCENTAGE';
  };
  interest?: {
    value: number;
    type: 'PERCENTAGE';
  };
  fine?: {
    value: number;
    type: 'PERCENTAGE';
  };
  cycle: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
  description?: string;
  endDate?: string;
  maxPayments?: number;
  externalReference?: string;
  split?: any[];
}

// Interface para resposta de cliente do Asaas
export interface IAsaasCustomerResponse {
  id: string;
  name: string;
  email: string;
  phone?: string;
  mobilePhone?: string;
  cpfCnpj?: string;
  postalCode?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  externalReference?: string;
  notificationDisabled: boolean;
  additionalEmails?: string;
  municipalInscription?: string;
  stateInscription?: string;
  observations?: string;
  deleted: boolean;
}

// Interface para resposta de assinatura do Asaas
export interface IAsaasSubscriptionResponse {
  id: string;
  dateCreated: string;
  customer: string;
  paymentLink?: string;
  billingType: string;
  value: number;
  nextDueDate: string;
  cycle: string;
  description: string;
  status: string;
  deleted: boolean;
}

class AsaasService {
  private config: AsaasConfig;
  private api: any;

  constructor() {
    this.config = {
      apiKey: process.env.ASAAS_API_KEY || '',
      baseUrl: process.env.ASAAS_BASE_URL || 'https://sandbox.asaas.com/api/v3'
    };

    this.api = axios.create({
      baseURL: this.config.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'access_token': this.config.apiKey
      }
    });
  }

  // Criar um cliente no Asaas
  async createCustomer(customerData: IAsaasCustomer): Promise<IAsaasCustomerResponse> {
    try {
      const response = await this.api.post('/customers', customerData);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao criar cliente no Asaas:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errors?.[0]?.description || 'Erro ao criar cliente no Asaas');
    }
  }

  // Obter um cliente do Asaas
  async getCustomer(customerId: string): Promise<IAsaasCustomerResponse> {
    try {
      const response = await this.api.get(`/customers/${customerId}`);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao obter cliente do Asaas:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errors?.[0]?.description || 'Erro ao obter cliente do Asaas');
    }
  }

  // Atualizar um cliente no Asaas
  async updateCustomer(customerId: string, customerData: Partial<IAsaasCustomer>): Promise<IAsaasCustomerResponse> {
    try {
      const response = await this.api.post(`/customers/${customerId}`, customerData);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao atualizar cliente no Asaas:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errors?.[0]?.description || 'Erro ao atualizar cliente no Asaas');
    }
  }

  // Criar uma assinatura no Asaas
  async createSubscription(subscriptionData: IAsaasSubscription): Promise<IAsaasSubscriptionResponse> {
    try {
      const response = await this.api.post('/subscriptions', subscriptionData);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao criar assinatura no Asaas:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errors?.[0]?.description || 'Erro ao criar assinatura no Asaas');
    }
  }

  // Obter uma assinatura do Asaas
  async getSubscription(subscriptionId: string): Promise<IAsaasSubscriptionResponse> {
    try {
      const response = await this.api.get(`/subscriptions/${subscriptionId}`);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao obter assinatura do Asaas:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errors?.[0]?.description || 'Erro ao obter assinatura do Asaas');
    }
  }

  // Cancelar uma assinatura no Asaas
  async cancelSubscription(subscriptionId: string): Promise<any> {
    try {
      const response = await this.api.delete(`/subscriptions/${subscriptionId}`);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao cancelar assinatura no Asaas:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errors?.[0]?.description || 'Erro ao cancelar assinatura no Asaas');
    }
  }

  // Listar assinaturas de um cliente
  async listCustomerSubscriptions(customerId: string): Promise<IAsaasSubscriptionResponse[]> {
    try {
      const response = await this.api.get('/subscriptions', {
        params: {
          customer: customerId
        }
      });
      return response.data.data;
    } catch (error: any) {
      console.error('Erro ao listar assinaturas do cliente no Asaas:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errors?.[0]?.description || 'Erro ao listar assinaturas do cliente no Asaas');
    }
  }
}

export default new AsaasService();
