import { Router } from 'express';
import {
  getCreditPackages,
  createCreditPackage,
  purchaseCredits,
  getUserTransactions,
  getCreditBalance,
  useCredits,
  paymentWebhook
} from '../controllers/creditController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Rotas públicas
router.get('/packages', getCreditPackages);
router.post('/webhook', paymentWebhook);

// Rotas protegidas
router.use(authMiddleware);

// @route   POST /api/credits/packages
// @desc    Criar pacote de créditos (Admin)
// @access  Private (Admin)
router.post('/packages', createCreditPackage);

// @route   POST /api/credits/purchase
// @desc    Comprar créditos
// @access  Private
router.post('/purchase', purchaseCredits);

// @route   GET /api/credits/transactions
// @desc    Obter histórico de transações do usuário
// @access  Private
router.get('/transactions', getUserTransactions);

// @route   GET /api/credits/balance
// @desc    Obter saldo de créditos do usuário
// @access  Private
router.get('/balance', getCreditBalance);

// @route   POST /api/credits/use
// @desc    Usar créditos (interno)
// @access  Private
router.post('/use', useCredits);

export default router;

