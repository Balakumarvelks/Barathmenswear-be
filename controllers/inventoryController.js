const Inventory = require('../models/Inventory');
const Product = require('../models/Product');

// @desc    Get inventory
// @route   GET /api/admin/inventory
// @access  Admin
exports.getInventory = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, lowStockOnly } = req.query;

    const filter = {};
    
    if (lowStockOnly === 'true') {
      filter.isLowStock = true;
    }

    if (search) {
      const products = await Product.find({
        name: { $regex: search, $options: 'i' }
      }).select('_id');
      
      filter.product = { $in: products.map(p => p._id) };
    }

    const skip = (page - 1) * limit;

    const inventory = await Inventory.find(filter)
      .populate('product', 'name brand')
      .sort({ isLowStock: -1, currentStock: 1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Inventory.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: inventory.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      inventory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single inventory item
// @route   GET /api/admin/inventory/:id
// @access  Admin
exports.getInventoryItem = async (req, res) => {
  try {
    const inventory = await Inventory.findById(req.params.id)
      .populate('product', 'name brand description')
      .populate('stockMovements.performedBy', 'firstName lastName email');

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    res.status(200).json({
      success: true,
      inventory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update inventory (add/remove stock)
// @route   PUT /api/admin/inventory/:id
// @access  Admin
exports.updateInventory = async (req, res) => {
  try {
    const { quantity, type, reason } = req.body;

    if (!quantity || !type || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Quantity, type, and reason are required'
      });
    }

    let inventory = await Inventory.findById(req.params.id);
    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    const previousStock = inventory.currentStock;

    if (type === 'IN') {
      inventory.currentStock += quantity;
      inventory.lastRestocked = Date.now();
    } else if (type === 'OUT') {
      inventory.currentStock -= quantity;
    } else if (type === 'ADJUSTMENT') {
      inventory.currentStock = quantity;
    }

    if (inventory.currentStock < 0) inventory.currentStock = 0;

    inventory.stockMovements.push({
      type,
      quantity: type === 'ADJUSTMENT' ? Math.abs(quantity - previousStock) : quantity,
      previousStock,
      newStock: inventory.currentStock,
      reason,
      reference: 'MANUAL',
      performedBy: req.user.id
    });

    await inventory.save();

    res.status(200).json({
      success: true,
      message: 'Inventory updated successfully',
      inventory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Set stock threshold
// @route   PUT /api/admin/inventory/:id/threshold
// @access  Admin
exports.setThreshold = async (req, res) => {
  try {
    const { minStockThreshold, maxStockThreshold, reorderPoint, reorderQuantity } = req.body;

    let inventory = await Inventory.findById(req.params.id);
    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    if (minStockThreshold !== undefined) inventory.minStockThreshold = minStockThreshold;
    if (maxStockThreshold !== undefined) inventory.maxStockThreshold = maxStockThreshold;
    if (reorderPoint !== undefined) inventory.reorderPoint = reorderPoint;
    if (reorderQuantity !== undefined) inventory.reorderQuantity = reorderQuantity;

    await inventory.save();

    res.status(200).json({
      success: true,
      message: 'Stock thresholds updated',
      inventory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get low stock alerts
// @route   GET /api/admin/inventory/alerts/low-stock
// @access  Admin
exports.getLowStockAlerts = async (req, res) => {
  try {
    const alerts = await Inventory.find({ isLowStock: true })
      .populate('product', 'name brand')
      .sort({ currentStock: 1 });

    res.status(200).json({
      success: true,
      count: alerts.length,
      alerts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get out of stock items
// @route   GET /api/admin/inventory/alerts/out-of-stock
// @access  Admin
exports.getOutOfStockItems = async (req, res) => {
  try {
    const items = await Inventory.find({ isOutOfStock: true })
      .populate('product', 'name brand')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: items.length,
      items
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update stock by product ID
// @route   POST /api/admin/inventory/update
// @access  Admin
exports.updateStockByProduct = async (req, res) => {
  try {
    const { productId, type, quantity, reason, notes } = req.body;

    if (!productId || !type || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Product ID, type, and quantity are required'
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const previousStock = product.stock;
    let newStock = previousStock;

    if (type === 'IN') {
      newStock = previousStock + parseInt(quantity);
    } else if (type === 'OUT') {
      newStock = previousStock - parseInt(quantity);
      if (newStock < 0) newStock = 0;
    } else if (type === 'ADJUSTMENT') {
      newStock = parseInt(quantity);
    }

    product.stock = newStock;
    await product.save();

    // Also update inventory record if exists
    let inventory = await Inventory.findOne({ product: productId });
    if (inventory) {
      inventory.currentStock = newStock;
      inventory.stockMovements.push({
        type,
        quantity: parseInt(quantity),
        previousStock,
        newStock,
        reason: reason || 'Manual adjustment',
        notes,
        reference: 'MANUAL',
        performedBy: req.user.id
      });
      await inventory.save();
    }

    res.status(200).json({
      success: true,
      message: 'Stock updated successfully',
      previousStock,
      newStock,
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get stock movements for item
// @route   GET /api/admin/inventory/:id/movements
// @access  Admin
exports.getStockMovements = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const inventory = await Inventory.findById(req.params.id);
    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    const skip = (page - 1) * limit;
    const movements = inventory.stockMovements
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(skip, skip + Number(limit));

    res.status(200).json({
      success: true,
      count: movements.length,
      total: inventory.stockMovements.length,
      pages: Math.ceil(inventory.stockMovements.length / limit),
      currentPage: page,
      movements
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

