const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const Payment = require('../models/Payment');
const Coupon = require('../models/Coupon');
const Inventory = require('../models/Inventory');

// @desc    Get dashboard overview
// @route   GET /api/admin/dashboard/overview
// @access  Admin
exports.getDashboardOverview = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    // Total Orders
    const totalOrders = await Order.countDocuments(
      dateFilter ? { createdAt: dateFilter } : {}
    );

    // Total Revenue
    const revenueData = await Order.aggregate([
      {
        $match: dateFilter ? { createdAt: dateFilter } : {}
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalDiscount: { $sum: '$discount' },
          totalCouponDiscount: { $sum: '$couponDiscount' }
        }
      }
    ]);

    const totalRevenue = revenueData[0]?.totalRevenue || 0;
    const totalDiscount = revenueData[0]?.totalDiscount || 0;
    const totalCouponDiscount = revenueData[0]?.totalCouponDiscount || 0;

    // Total Customers
    const totalCustomers = await User.countDocuments({ role: 'customer' });

    // New Customers This Month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const newCustomersThisMonth = await User.countDocuments({
      role: 'customer',
      createdAt: { $gte: monthStart }
    });

    // Order Status Breakdown
    const orderStatusBreakdown = await Order.aggregate([
      {
        $match: dateFilter ? { createdAt: dateFilter } : {}
      },
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Payment Status Breakdown
    const paymentStatusBreakdown = await Payment.aggregate([
      {
        $match: dateFilter ? { createdAt: dateFilter } : {}
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      overview: {
        totalOrders,
        totalRevenue,
        totalDiscount,
        totalCouponDiscount,
        totalCustomers,
        newCustomersThisMonth,
        orderStatusBreakdown,
        paymentStatusBreakdown
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get sales analytics
// @route   GET /api/admin/dashboard/sales
// @access  Admin
exports.getSalesAnalytics = async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;

    let groupBy = '$month';
    let dateFormat = '%Y-%m';

    if (period === 'daily') {
      groupBy = '$dateToString';
      dateFormat = '%Y-%m-%d';
    } else if (period === 'yearly') {
      groupBy = '$year';
      dateFormat = '%Y';
    }

    const salesData = await Order.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          totalSales: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
          totalDiscount: { $sum: { $add: ['$discount', '$couponDiscount'] } },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      period,
      salesData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get top products
// @route   GET /api/admin/dashboard/top-products
// @access  Admin
exports.getTopProducts = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const topProducts = await Order.aggregate([
      {
        $unwind: '$items'
      },
      {
        $group: {
          _id: '$items.product',
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.total' },
          orderCount: { $sum: 1 },
          avgPrice: { $avg: '$items.price' }
        }
      },
      {
        $sort: { totalSold: -1 }
      },
      {
        $limit: Number(limit)
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      {
        $unwind: '$productDetails'
      },
      {
        $project: {
          _id: 1,
          productName: '$productDetails.name',
          productBrand: '$productDetails.brand',
          totalSold: 1,
          totalRevenue: 1,
          orderCount: 1,
          avgPrice: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      count: topProducts.length,
      topProducts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get category performance
// @route   GET /api/admin/dashboard/category-performance
// @access  Admin
exports.getCategoryPerformance = async (req, res) => {
  try {
    const categoryPerformance = await Order.aggregate([
      {
        $unwind: '$items'
      },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: '$product'
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'product.category',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $unwind: '$category'
      },
      {
        $group: {
          _id: '$category._id',
          categoryName: { $first: '$category.name' },
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.total' },
          productCount: { $addToSet: '$product._id' }
        }
      },
      {
        $addFields: {
          productCount: { $size: '$productCount' }
        }
      },
      {
        $sort: { totalRevenue: -1 }
      }
    ]);

    res.status(200).json({
      success: true,
      count: categoryPerformance.length,
      categoryPerformance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get customer analytics
// @route   GET /api/admin/dashboard/customers
// @access  Admin
exports.getCustomerAnalytics = async (req, res) => {
  try {
    // Total customers
    const totalCustomers = await User.countDocuments({ role: 'customer' });

    // Customers with orders
    const customersWithOrders = await Order.distinct('user');

    // High-value customers (top spenders)
    const highValueCustomers = await Order.aggregate([
      {
        $group: {
          _id: '$user',
          totalSpent: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
          avgOrderValue: { $avg: '$totalAmount' }
        }
      },
      {
        $sort: { totalSpent: -1 }
      },
      {
        $limit: 10
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'customerDetails'
        }
      },
      {
        $unwind: '$customerDetails'
      },
      {
        $project: {
          _id: 1,
          customerName: { $concat: ['$customerDetails.firstName', ' ', '$customerDetails.lastName'] },
          customerEmail: '$customerDetails.email',
          totalSpent: 1,
          orderCount: 1,
          avgOrderValue: 1
        }
      }
    ]);

    // Customer retention
    const lastMonthStart = new Date();
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);

    const returningCustomers = await Order.aggregate([
      {
        $group: {
          _id: '$user',
          orderCount: { $sum: 1 }
        }
      },
      {
        $match: { orderCount: { $gte: 2 } }
      },
      {
        $count: 'count'
      }
    ]);

    // New customers this month
    const monthStart = new Date();
    monthStart.setDate(1);

    const newCustomersThisMonth = await User.countDocuments({
      role: 'customer',
      createdAt: { $gte: monthStart }
    });

    res.status(200).json({
      success: true,
      analytics: {
        totalCustomers,
        customersWithOrders: customersWithOrders.length,
        returningCustomers: returningCustomers[0]?.count || 0,
        newCustomersThisMonth,
        highValueCustomers
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get payment analytics
// @route   GET /api/admin/dashboard/payments
// @access  Admin
exports.getPaymentAnalytics = async (req, res) => {
  try {
    const paymentMethodBreakdown = await Payment.aggregate([
      {
        $group: {
          _id: '$method',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          successCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0]
            }
          },
          failureCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          method: '$_id',
          totalTransactions: '$count',
          totalAmount: 1,
          successRate: {
            $cond: [
              { $eq: ['$count', 0] },
              0,
              { $multiply: [{ $divide: ['$successCount', '$count'] }, 100] }
            ]
          },
          _id: 0
        }
      },
      {
        $sort: { totalAmount: -1 }
      }
    ]);

    const refundAnalytics = await Payment.aggregate([
      {
        $match: { refundStatus: 'PROCESSED' }
      },
      {
        $group: {
          _id: null,
          totalRefunds: { $sum: 1 },
          totalRefundAmount: { $sum: '$refundAmount' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      analytics: {
        paymentMethodBreakdown,
        refunds: refundAnalytics[0] || { totalRefunds: 0, totalRefundAmount: 0 }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get inventory analytics
// @route   GET /api/admin/dashboard/inventory
// @access  Admin
exports.getInventoryAnalytics = async (req, res) => {
  try {
    const totalInventory = await Inventory.countDocuments();
    const lowStockItems = await Inventory.countDocuments({ isLowStock: true });
    const outOfStockItems = await Inventory.countDocuments({ isOutOfStock: true });

    const totalStock = await Inventory.aggregate([
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$currentStock' },
          totalValue: {
            $sum: {
              $multiply: ['$currentStock', 100] // Assuming avg price of 100
            }
          }
        }
      }
    ]);

    const topStockItems = await Inventory.find()
      .populate('product', 'name brand')
      .sort({ currentStock: -1 })
      .limit(10)
      .select('product currentStock currentStock availableStock');

    res.status(200).json({
      success: true,
      analytics: {
        totalInventory,
        lowStockItems,
        outOfStockItems,
        totalQuantity: totalStock[0]?.totalQuantity || 0,
        topStockItems
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get coupon analytics
// @route   GET /api/admin/dashboard/coupons
// @access  Admin
exports.getCouponAnalytics = async (req, res) => {
  try {
    const totalCoupons = await Coupon.countDocuments();
    const activeCoupons = await Coupon.countDocuments({ isActive: true });
    const expiredCoupons = await Coupon.countDocuments({ validUntil: { $lt: new Date() } });

    const couponUsageData = await Coupon.aggregate([
      {
        $group: {
          _id: null,
          totalUsage: { $sum: '$usedCount' },
          totalDiscount: { $sum: '$value' }
        }
      }
    ]);

    const topCoupons = await Coupon.find()
      .sort({ usedCount: -1 })
      .limit(10)
      .select('code name value type usedCount usageLimit');

    res.status(200).json({
      success: true,
      analytics: {
        totalCoupons,
        activeCoupons,
        expiredCoupons,
        totalUsage: couponUsageData[0]?.totalUsage || 0,
        topCoupons
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
