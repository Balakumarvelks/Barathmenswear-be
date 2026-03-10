const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getCoupons,
  validateCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getAllCoupons,
  getCouponAnalytics
} = require('../controllers/couponController');

// Public routes
router.get('/', getCoupons);
router.post('/validate', validateCoupon);

// Admin routes
router.post('/', protect, authorize('admin'), createCoupon);
router.get('/admin/all', protect, authorize('admin'), getAllCoupons);
router.put('/:id', protect, authorize('admin'), updateCoupon);
router.delete('/:id', protect, authorize('admin'), deleteCoupon);
router.get('/:id/analytics', protect, authorize('admin'), getCouponAnalytics);

module.exports = router;
