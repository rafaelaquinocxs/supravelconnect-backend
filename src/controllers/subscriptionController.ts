import { Request, Response } from 'express';
import User from '../models/userModel';

// Planos disponíveis (em produção, isso viria do banco de dados)
const SUBSCRIPTION_PLANS = {
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
export const getSubscriptionPlans = async (req: Request, res: Response) => {
  try {
    const userRole = req.user?.role || 'client';
    const plans = SUBSCRIPTION_PLANS[userRole as keyof typeof SUBSCRIPTION_PLANS] || SUBSCRIPTION_PLANS.client;

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
export const getCurrentSubscription = async (req: Request, res: Response) => {
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
    if (!user.subscriptionPlan) {
      return res.status(200).json({
        success: true,
        data: null
      });
    }

    // Buscar detalhes do plano
    const userRole = req.user?.role || 'client';
    const plans = SUBSCRIPTION_PLANS[userRole as keyof typeof SUBSCRIPTION_PLANS] || SUBSCRIPTION_PLANS.client;
    const plan = plans.find(p => p.id === user.subscriptionPlan);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plano não encontrado'
      });
    }

    const subscription = {
      id: user._id,
      planId: user.subscriptionPlan,
      status: user.subscriptionStatus || 'active',
      startDate: user.subscriptionStartDate,
      endDate: user.subscriptionEndDate,
      plan: plan,
      autoRenew: user.autoRenew || false,
      nextBillingDate: user.subscriptionEndDate,
      paymentMethod: user.paymentMethod || 'Cartão de Crédito'
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
export const subscribeToplan = async (req: Request, res: Response) => {
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
    const plans = SUBSCRIPTION_PLANS[userRole as keyof typeof SUBSCRIPTION_PLANS] || SUBSCRIPTION_PLANS.client;
    const plan = plans.find(p => p.id === planId);

    if (!plan) {
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

    user.subscriptionPlan = planId;
    user.subscriptionStatus = 'active';
    user.subscriptionStartDate = startDate;
    user.subscriptionEndDate = endDate;
    user.autoRenew = true;

    // Se for cliente, adicionar créditos
    if (userRole === 'client' && plan.credits) {
      user.credits = (user.credits || 0) + plan.credits;
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
export const cancelSubscription = async (req: Request, res: Response) => {
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

    if (!user.subscriptionPlan) {
      return res.status(400).json({
        success: false,
        message: 'Usuário não possui assinatura ativa'
      });
    }

    // Cancelar assinatura (mantém até o final do período)
    user.subscriptionStatus = 'cancelled';
    user.autoRenew = false;
    user.cancellationReason = reason;
    user.cancellationDate = new Date();

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
export const reactivateSubscription = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    if (user.subscriptionStatus !== 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Assinatura não está cancelada'
      });
    }

    // Reativar assinatura
    user.subscriptionStatus = 'active';
    user.autoRenew = true;
    user.cancellationReason = undefined;
    user.cancellationDate = undefined;

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
export const toggleAutoRenew = async (req: Request, res: Response) => {
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

    if (!user.subscriptionPlan) {
      return res.status(400).json({
        success: false,
        message: 'Usuário não possui assinatura ativa'
      });
    }

    user.autoRenew = autoRenew;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        autoRenew: user.autoRenew
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
export const getPaymentHistory = async (req: Request, res: Response) => {
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
