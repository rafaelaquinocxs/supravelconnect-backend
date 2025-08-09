import { Request, Response } from 'express';
import CreditPackage from '../models/creditPackageModel';
import CreditTransaction, { TransactionType, TransactionStatus, PaymentMethod } from '../models/creditTransactionModel';
import User from '../models/userModel';
import mongoose from 'mongoose';

interface AuthRequest extends Request {
  user?: any;
}

// @desc    Listar pacotes de créditos disponíveis
// @route   GET /api/credits/packages
// @access  Public
export const getCreditPackages = async (req: Request, res: Response) => {
  try {
    const packages = await CreditPackage.find({ isActive: true })
      .sort({ price: 1 });

    res.json({
      success: true,
      data: packages
    });

  } catch (error: any) {
    console.error('Erro ao buscar pacotes de créditos:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    });
  }
};

// @desc    Criar pacote de créditos (Admin)
// @route   POST /api/credits/packages
// @access  Private (Admin)
export const createCreditPackage = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      description,
      credits,
      price,
      discount,
      isPopular,
      features,
      validityDays
    } = req.body;

    // Verificar se é admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }

    // Validar dados obrigatórios
    if (!name || !description || !credits || !price) {
      return res.status(400).json({
        success: false,
        message: 'Todos os campos obrigatórios devem ser preenchidos'
      });
    }

    const creditPackage = new CreditPackage({
      name,
      description,
      credits,
      price,
      discount: discount || 0,
      isPopular: isPopular || false,
      features: features || [],
      validityDays
    });

    await creditPackage.save();

    res.status(201).json({
      success: true,
      message: 'Pacote de créditos criado com sucesso',
      data: creditPackage
    });

  } catch (error: any) {
    console.error('Erro ao criar pacote de créditos:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    });
  }
};

// @desc    Comprar créditos
// @route   POST /api/credits/purchase
// @access  Private
export const purchaseCredits = async (req: AuthRequest, res: Response) => {
  try {
    const {
      packageId,
      paymentMethod,
      paymentData
    } = req.body;

    // Validar dados obrigatórios
    if (!packageId || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Pacote e método de pagamento são obrigatórios'
      });
    }

    // Verificar se o pacote existe
    const creditPackage = await CreditPackage.findById(packageId);
    if (!creditPackage || !creditPackage.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Pacote de créditos não encontrado'
      });
    }

    // Verificar se o usuário existe
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Criar transação
    const transaction = new CreditTransaction({
      userId: req.user._id,
      type: TransactionType.PURCHASE,
      status: TransactionStatus.PENDING,
      credits: creditPackage.credits,
      amount: creditPackage.price,
      packageId: creditPackage._id,
      paymentMethod,
      paymentData,
      description: `Compra de ${creditPackage.credits} créditos - ${creditPackage.name}`
    });

    await transaction.save();

    // Simular processamento de pagamento
    // Em produção, aqui seria integrado com gateway de pagamento (Asaas, Stripe, etc.)
    const paymentSuccess = await simulatePaymentProcessing(paymentMethod, creditPackage.price, paymentData);

    if (paymentSuccess.success) {
      // Pagamento aprovado - adicionar créditos ao usuário
      user.credits += creditPackage.credits;
      await user.save();

      // Atualizar transação
      transaction.status = TransactionStatus.COMPLETED;
      transaction.paymentId = paymentSuccess.paymentId;
      transaction.processedAt = new Date();
      
      // Definir expiração se o pacote tiver validade
      if (creditPackage.validityDays) {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + creditPackage.validityDays);
        transaction.expiresAt = expirationDate;
      }

      await transaction.save();

      res.status(200).json({
        success: true,
        message: 'Compra realizada com sucesso',
        data: {
          transaction,
          newBalance: user.credits,
          paymentId: paymentSuccess.paymentId
        }
      });

    } else {
      // Pagamento falhou
      transaction.status = TransactionStatus.FAILED;
      transaction.notes = paymentSuccess.error;
      await transaction.save();

      res.status(400).json({
        success: false,
        message: 'Falha no pagamento: ' + paymentSuccess.error
      });
    }

  } catch (error: any) {
    console.error('Erro ao comprar créditos:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    });
  }
};

// @desc    Obter histórico de transações do usuário
// @route   GET /api/credits/transactions
// @access  Private
export const getUserTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, type, status } = req.query;
    const userId = req.user._id;

    // Construir query
    const query: any = { userId };
    
    if (type) {
      query.type = type;
    }
    
    if (status) {
      query.status = status;
    }

    // Paginação
    const skip = (Number(page) - 1) * Number(limit);

    // Buscar transações
    const transactions = await CreditTransaction.find(query)
      .populate('packageId', 'name credits price')
      .populate('appointmentId', 'title scheduledDate')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Contar total
    const total = await CreditTransaction.countDocuments(query);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          current: Number(page),
          pages: Math.ceil(total / Number(limit)),
          total
        }
      }
    });

  } catch (error: any) {
    console.error('Erro ao buscar transações:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    });
  }
};

// @desc    Obter saldo de créditos do usuário
// @route   GET /api/credits/balance
// @access  Private
export const getCreditBalance = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id).select('credits');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Buscar créditos que expiram em breve (próximos 30 dias)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringCredits = await CreditTransaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.user._id),
          type: TransactionType.PURCHASE,
          status: TransactionStatus.COMPLETED,
          expiresAt: { $exists: true, $lte: thirtyDaysFromNow }
        }
      },
      {
        $group: {
          _id: null,
          totalExpiring: { $sum: '$credits' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        balance: user.credits,
        expiringCredits: expiringCredits[0]?.totalExpiring || 0
      }
    });

  } catch (error: any) {
    console.error('Erro ao buscar saldo:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    });
  }
};

// @desc    Usar créditos (interno - chamado pelo sistema de agendamento)
// @route   POST /api/credits/use
// @access  Private
export const useCredits = async (req: AuthRequest, res: Response) => {
  try {
    const { credits, description, appointmentId } = req.body;

    if (!credits || credits <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantidade de créditos inválida'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    if (user.credits < credits) {
      return res.status(400).json({
        success: false,
        message: 'Créditos insuficientes'
      });
    }

    // Debitar créditos
    user.credits -= credits;
    await user.save();

    // Criar transação de uso
    const transaction = new CreditTransaction({
      userId: req.user._id,
      type: TransactionType.USAGE,
      status: TransactionStatus.COMPLETED,
      credits: -credits, // negativo para indicar débito
      amount: 0,
      appointmentId,
      description: description || 'Uso de créditos',
      processedAt: new Date()
    });

    await transaction.save();

    res.json({
      success: true,
      message: 'Créditos utilizados com sucesso',
      data: {
        transaction,
        newBalance: user.credits
      }
    });

  } catch (error: any) {
    console.error('Erro ao usar créditos:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    });
  }
};

// Função auxiliar para simular processamento de pagamento
async function simulatePaymentProcessing(paymentMethod: PaymentMethod, amount: number, paymentData: any) {
  // Simular delay de processamento
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Simular sucesso/falha baseado em dados do pagamento
  const success = Math.random() > 0.1; // 90% de sucesso

  if (success) {
    return {
      success: true,
      paymentId: `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  } else {
    return {
      success: false,
      error: 'Cartão recusado ou dados inválidos'
    };
  }
}

// @desc    Webhook para notificações de pagamento (para integração futura)
// @route   POST /api/credits/webhook
// @access  Public (com validação de assinatura)
export const paymentWebhook = async (req: Request, res: Response) => {
  try {
    // Aqui seria implementada a validação da assinatura do webhook
    // e o processamento das notificações de pagamento do gateway
    
    const { event, data } = req.body;
    
    console.log('Webhook recebido:', event, data);
    
    // Processar diferentes tipos de eventos
    switch (event) {
      case 'payment.approved':
        // Processar pagamento aprovado
        break;
      case 'payment.refused':
        // Processar pagamento recusado
        break;
      case 'payment.refunded':
        // Processar estorno
        break;
      default:
        console.log('Evento não reconhecido:', event);
    }

    res.status(200).json({ received: true });

  } catch (error: any) {
    console.error('Erro no webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar webhook'
    });
  }
};

