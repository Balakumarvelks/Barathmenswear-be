const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  getDashboardStats
} = require('../controllers/adminController');
const {
  getDashboardOverview,
  getSalesAnalytics,
  getTopProducts,
  getCategoryPerformance,
  getCustomerAnalytics,
  getPaymentAnalytics,
  getInventoryAnalytics,
  getCouponAnalytics
} = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');

// All routes require admin authentication
router.use(protect);
router.use(authorize('admin'));

// Dashboard analytics routes
router.get('/dashboard/overview', getDashboardOverview);
router.get('/dashboard/sales', getSalesAnalytics);
router.get('/dashboard/top-products', getTopProducts);
router.get('/dashboard/category-performance', getCategoryPerformance);
router.get('/dashboard/customers', getCustomerAnalytics);
router.get('/dashboard/payments', getPaymentAnalytics);
router.get('/dashboard/inventory', getInventoryAnalytics);
router.get('/dashboard/coupons', getCouponAnalytics);

// Legacy dashboard route
router.get('/dashboard', getDashboardStats);

// User management routes
router.route('/users')
  .get(getUsers)
  .post(createUser);

router.route('/users/:id')
  .get(getUser)
  .put(updateUser)
  .delete(deleteUser);

router.put('/users/:id/toggle-status', toggleUserStatus);

module.exports = router;
