const Coupon = require('../models/Coupon');

// @desc    Get all coupons
// @route   GET /api/coupons
// @access  Public
exports.getCoupons = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const coupons = await Coupon.find({ isActive: true })
      .select('-usedBy')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Coupon.countDocuments({ isActive: true });

    res.status(200).json({
      success: true,
      count: coupons.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      coupons
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Validate coupon
// @route   POST /api/coupons/validate
// @access  Public
exports.validateCoupon = async (req, res) => {
  try {
    const { code, orderAmount } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code is required'
      });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Invalid coupon code'
      });
    }

    if (!coupon.isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Coupon has expired or is not valid'
      });
    }

    if (orderAmount && orderAmount < coupon.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount of ₹${coupon.minOrderAmount} required`
      });
    }

    const discount = coupon.calculateDiscount(orderAmount || 0);

    res.status(200).json({
      success: true,
      message: 'Coupon is valid',
      coupon: {
        code: coupon.code,
        name: coupon.name,
        description: coupon.description,
        type: coupon.type,
        value: coupon.value,
        discount: discount,
        maxDiscount: coupon.maxDiscount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create coupon (Admin)
// @route   POST /api/admin/coupons
// @access  Admin
exports.createCoupon = async (req, res) => {
  try {
    const { code, name, description, type, value, minOrderAmount, maxDiscount, validFrom, validUntil, usageLimit, perUserLimit, applicableProducts, applicableCategories, excludedProducts } = req.body;

    // Validate required fields
    if (!code || !name || !type || !value || !validFrom || !validUntil) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if coupon already exists
    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code already exists'
      });
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      name,
      description,
      type,
      value,
      minOrderAmount: minOrderAmount || 0,
      maxDiscount: maxDiscount || null,
      validFrom,
      validUntil,
      usageLimit: usageLimit || null,
      perUserLimit: perUserLimit || 1,
      applicableProducts: applicableProducts || [],
      applicableCategories: applicableCategories || [],
      excludedProducts: excludedProducts || [],
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Coupon created successfully',
      coupon
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update coupon (Admin)
// @route   PUT /api/admin/coupons/:id
// @access  Admin
exports.updateCoupon = async (req, res) => {
  try {
    let coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    const { name, description, value, minOrderAmount, maxDiscount, validFrom, validUntil, usageLimit, perUserLimit, isActive, applicableProducts, applicableCategories, excludedProducts } = req.body;

    if (name) coupon.name = name;
    if (description !== undefined) coupon.description = description;
    if (value) coupon.value = value;
    if (minOrderAmount !== undefined) coupon.minOrderAmount = minOrderAmount;
    if (maxDiscount !== undefined) coupon.maxDiscount = maxDiscount;
    if (validFrom) coupon.validFrom = validFrom;
    if (validUntil) coupon.validUntil = validUntil;
    if (usageLimit !== undefined) coupon.usageLimit = usageLimit;
    if (perUserLimit) coupon.perUserLimit = perUserLimit;
    if (isActive !== undefined) coupon.isActive = isActive;
    if (applicableProducts) coupon.applicableProducts = applicableProducts;
    if (applicableCategories) coupon.applicableCategories = applicableCategories;
    if (excludedProducts) coupon.excludedProducts = excludedProducts;

    coupon = await coupon.save();

    res.status(200).json({
      success: true,
      message: 'Coupon updated successfully',
      coupon
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete coupon (Admin)
// @route   DELETE /api/admin/coupons/:id
// @access  Admin
exports.deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Coupon deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all coupons (Admin)
// @route   GET /api/admin/coupons
// @access  Admin
exports.getAllCoupons = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const filter = {};
    if (status === 'active') {
      filter.isActive = true;
    } else if (status === 'expired') {
      filter.validUntil = { $lt: new Date() };
    } else if (status === 'upcoming') {
      filter.validFrom = { $gt: new Date() };
    }

    const skip = (page - 1) * limit;

    const coupons = await Coupon.find(filter)
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Coupon.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: coupons.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      coupons
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get coupon usage analytics (Admin)
// @route   GET /api/admin/coupons/:id/analytics
// @access  Admin
exports.getCouponAnalytics = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    const usagePercentage = coupon.usageLimit
      ? (coupon.usedCount / coupon.usageLimit) * 100
      : 0;

    res.status(200).json({
      success: true,
      analytics: {
        code: coupon.code,
        totalUsage: coupon.usedCount,
        usageLimit: coupon.usageLimit,
        usagePercentage,
        uniqueUsers: coupon.usedBy.length,
        totalDiscount: coupon.usedBy.length * coupon.value, // Approximate
        validFrom: coupon.validFrom,
        validUntil: coupon.validUntil,
        isExpired: new Date() > coupon.validUntil
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
