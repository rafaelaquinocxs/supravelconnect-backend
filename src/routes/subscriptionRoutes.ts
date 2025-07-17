import { Router } from 'express';
import {
  getSubscriptionPlans,
  getCurrentSubscription,
  subscribeToplan,
  cancelSubscription,
  reactivateSubscription,
  toggleAutoRenew,
  getPaymentHistory
} from '../controllers/subscriptionController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Rotas públicas
router.get('/plans', getSubscriptionPlans);

// Rotas protegidas (requerem autenticação)
router.get('/current', authMiddleware, getCurrentSubscription);
router.post('/subscribe', authMiddleware, subscribeToplan);
router.post('/cancel', authMiddleware, cancelSubscription);
router.post('/reactivate', authMiddleware, reactivateSubscription);
router.post('/auto-renew', authMiddleware, toggleAutoRenew);
router.get('/payment-history', authMiddleware, getPaymentHistory);

export default router;
