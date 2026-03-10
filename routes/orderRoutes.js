const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createOrder,
  getUserOrders,
  getOrder,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  updatePaymentStatus,
  processRefund,
  getInvoice,
  sendInvoiceEmail
} = require('../controllers/orderController');

// Create order
router.post('/', protect, createOrder);

// Get user orders
router.get('/', protect, getUserOrders);

// Admin routes
router.get('/admin/all', protect, authorize('admin'), getAllOrders);
router.put('/:id/status', protect, authorize('admin'), updateOrderStatus);
router.put('/:id/payment-status', protect, authorize('admin'), updatePaymentStatus);
router.post('/:id/refund', protect, authorize('admin'), processRefund);

// Get invoice
router.get('/:id/invoice', protect, getInvoice);

// Send invoice to customer email (Owner or Admin)
router.post('/:id/send-invoice', protect, sendInvoiceEmail);

// Get single order (after admin routes to prevent conflict)
router.get('/:id', protect, getOrder);

// Cancel order
router.put('/:id/cancel', protect, cancelOrder);

module.exports = router;
