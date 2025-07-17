import { Request, Response } from 'express';
import User from '../models/userModel';

// Interface para Request autenticado
interface AuthRequest extends Request {
  user?: any;
}

// Interface para planos de assinatura
interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  credits?: number;
  commission?: number;
  features: string[];
  isPopular?: boolean;
}

// Planos disponíveis (em produção, isso viria do banco de dados)
const SUBSCRIPTION_PLANS: { [key: string]: SubscriptionPlan[] } = {
  client: [
    {
      id: 'client_basic',
      name: 'Básico',
      description: 'Ideal para uso pessoal',
      price: 29.90,
      credits: 50,
      features: [
        '50 créditos mensais',
        'Suporte técnico básico',
        'Acesso a técnicos certificados',
        'Histórico de sessões'
      ]
    },
    {
      id: 'client_premium',
      name: 'Premium',
      description: 'Perfeito para pequenas empresas',
      price: 59.90,
      credits: 120,
      features: [
        '120 créditos mensais',
        'Suporte técnico prioritário',
        'Acesso a técnicos especialistas',
        'Histórico completo',
        'Relatórios detalhados',
        'Agendamento flexível'
      ],
      isPopular: true
    },
    {
      id: 'client_enterprise',
      name: 'Empresarial',
      description: 'Para grandes operações',
      price: 149.90,
      credits: 350,
      features: [
        '350 créditos mensais',
        'Suporte 24/7',
        'Técnicos dedicados',
        'API de integração',
        'Relatórios avançados',
        'Gerenciamento de equipe',
        'SLA garantido'
      ]
    }
  ],
  technician: [
    {
      id: 'tech_basic',
      name: 'Básico',
      description: 'Para técnicos iniciantes',
      price: 19.90,
      commission: 70,
      features: [
        '70% de comissão',
        'Perfil básico',
        'Suporte por email',
        'Pagamentos quinzenais'
      ]
    },
    {
      id: 'tech_professional',
      name: 'Profissional',
      description: 'Para técnicos experientes',
      price: 39.90,
      commission: 80,
      features: [
        '80% de comissão',
        'Perfil destacado',
        'Suporte prioritário',
        'Pagamentos semanais',
        'Ferramentas avançadas',
        'Certificações'
      ],
      isPopular: true
    },
    {
      id: 'tech_expert',
      name: 'Expert',
      description: 'Para especialistas',
      price: 79.90,
      commission: 85,
      features: [
        '85% de comissão',
        'Perfil premium',
        'Suporte dedicado',
        'Pagamentos diários',
        'Acesso antecipado',
        'Programa de mentoria',
        'Badge de especialista'
      ]
    }
  ]
};

// @desc    Obter planos disponíveis
// @route   GET /api/subscriptions/plans
// @access  Public
export const getSubscriptionPlans = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role || 'client';
    const plans = SUBSCRIPTION_PLANS[userRole] || SUBSCRIPTION_PLANS.client;

    res.status(200).json({
      success: true,
      data: plans
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao obter planos'
    });
  }
};

// @desc    Obter assinatura atual do usuário
// @route   GET /api/subscriptions/current
// @access  Private
export const getCurrentSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;

    const user = await User.findById(userId).select('subscriptionPlan subscriptionStatus subscriptionStartDate subscriptionEndDate');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Se não tem assinatura, retorna null
    if (!(user as any).subscriptionPlan) {
      return res.status(200).json({
        success: true,
        data: null
      });
    }

    // Buscar detalhes do plano
    const userRole = req.user?.role || 'client';
    const plans = SUBSCRIPTION_PLANS[userRole] || SUBSCRIPTION_PLANS.client;
    const plan = plans.find(p => p.id === (user as any).subscriptionPlan);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plano não encontrado'
      });
    }

    const subscription = {
      id: user._id,
      planId: (user as any).subscriptionPlan,
      status: (user as any).subscriptionStatus || 'active',
      startDate: (user as any).subscriptionStartDate,
      endDate: (user as any).subscriptionEndDate,
      plan: plan,
      autoRenew: (user as any).autoRenew || false,
      nextBillingDate: (user as any).subscriptionEndDate,
      paymentMethod: (user as any).paymentMethod || 'Cartão de Crédito'
    };

    res.status(200).json({
      success: true,
      data: subscription
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao obter assinatura'
    });
  }
};

// @desc    Assinar um plano
// @route   POST /api/subscriptions/subscribe
// @access  Private
export const subscribeToplan = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: 'ID do plano é obrigatório'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Verificar se o plano existe
    const userRole = user.role || 'client';
    const plans = SUBSCRIPTION_PLANS[userRole] || SUBSCRIPTION_PLANS.client;
    const selectedPlan = plans.find(p => p.id === planId);

    if (!selectedPlan) {
      return res.status(404).json({
        success: false,
        message: 'Plano não encontrado'
      });
    }

    // Simular integração com gateway de pagamento (Asaas)
    // Em produção, aqui você faria a chamada real para o Asaas
    const paymentUrl = `https://sandbox.asaas.com/checkout/${Date.now()}`;

    // Atualizar usuário com nova assinatura
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    (user as any).subscriptionPlan = planId;
    (user as any).subscriptionStatus = 'active';
    (user as any).subscriptionStartDate = startDate;
    (user as any).subscriptionEndDate = endDate;
    (user as any).autoRenew = true;

    // CORREÇÃO: Se for cliente, adicionar créditos com verificação segura
    if (userRole === 'client' && selectedPlan.credits) {
      const creditsToAdd = selectedPlan.credits || 0;
      (user as any).credits = ((user as any).credits || 0) + creditsToAdd;
      console.log(`Adicionando ${creditsToAdd} créditos para usuário ${user._id}`);
    }

    await user.save();

    res.status(200).json({
      success: true,
      data: {
        paymentUrl,
        subscription: {
          planId,
          status: 'active',
          startDate,
          endDate
        }
      },
      message: 'Assinatura criada com sucesso'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao processar assinatura'
    });
  }
};

// @desc    Cancelar assinatura
// @route   POST /api/subscriptions/cancel
// @access  Private
export const cancelSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { reason } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    if (!(user as any).subscriptionPlan) {
      return res.status(400).json({
        success: false,
        message: 'Usuário não possui assinatura ativa'
      });
    }

    // Cancelar assinatura (mantém até o final do período)
    (user as any).subscriptionStatus = 'cancelled';
    (user as any).autoRenew = false;
    (user as any).cancellationReason = reason;
    (user as any).cancellationDate = new Date();

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Assinatura cancelada com sucesso'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao cancelar assinatura'
    });
  }
};

// @desc    Reativar assinatura
// @route   POST /api/subscriptions/reactivate
// @access  Private
export const reactivateSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    if ((user as any).subscriptionStatus !== 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Assinatura não está cancelada'
      });
    }

    // Reativar assinatura
    (user as any).subscriptionStatus = 'active';
    (user as any).autoRenew = true;
    (user as any).cancellationReason = undefined;
    (user as any).cancellationDate = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Assinatura reativada com sucesso'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao reativar assinatura'
    });
  }
};

// @desc    Alterar renovação automática
// @route   POST /api/subscriptions/auto-renew
// @access  Private
export const toggleAutoRenew = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { autoRenew } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    if (!(user as any).subscriptionPlan) {
      return res.status(400).json({
        success: false,
        message: 'Usuário não possui assinatura ativa'
      });
    }

    (user as any).autoRenew = autoRenew;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        autoRenew: (user as any).autoRenew
      },
      message: `Renovação automática ${autoRenew ? 'ativada' : 'desativada'}`
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao alterar renovação automática'
    });
  }
};

// @desc    Obter histórico de pagamentos
// @route   GET /api/subscriptions/payment-history
// @access  Private
export const getPaymentHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;

    // Em produção, isso viria de uma tabela de pagamentos
    // Por enquanto, simulando dados
    const mockPayments = [
      {
        id: '1',
        amount: 59.90,
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'paid',
        description: 'Assinatura Premium - Janeiro 2025',
        paymentMethod: 'Cartão de Crédito'
      },
      {
        id: '2',
        amount: 59.90,
        date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'paid',
        description: 'Assinatura Premium - Dezembro 2024',
        paymentMethod: 'Cartão de Crédito'
      }
    ];

    res.status(200).json({
      success: true,
      data: mockPayments
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao obter histórico de pagamentos'
    });
  }
};
