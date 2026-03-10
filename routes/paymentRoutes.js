const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getPaymentByOrder,
  initializePayment,
  verifyPayment,
  processRefund,
  getPaymentHistory,
  getStripeStatus
} = require('../controllers/paymentController');

// Check Stripe status
router.get('/stripe-status', protect, getStripeStatus);

// Get payment by order
router.get('/order/:orderId', protect, getPaymentByOrder);

// Get payment history
router.get('/history', protect, getPaymentHistory);

// Initialize payment
router.post('/initialize', protect, initializePayment);

// Verify payment
router.post('/verify', verifyPayment);

// Process refund
router.post('/:paymentId/refund', protect, authorize('admin'), processRefund);

module.exports = router;
