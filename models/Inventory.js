const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['IN', 'OUT', 'ADJUSTMENT', 'RETURN'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  previousStock: {
    type: Number,
    required: true
  },
  newStock: {
    type: Number,
    required: true
  },
  reason: String,
  reference: {
    type: String,
    enum: ['ORDER', 'MANUAL', 'RETURN', 'DAMAGE', 'RESTOCK'],
    required: true
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const inventorySchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  variant: {
    size: String,
    color: String
  },
  sku: {
    type: String,
    unique: true,
    sparse: true
  },
  currentStock: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  reservedStock: {
    type: Number,
    default: 0,
    min: 0
  },
  availableStock: {
    type: Number,
    default: 0
  },
  minStockThreshold: {
    type: Number,
    default: 10
  },
  maxStockThreshold: {
    type: Number,
    default: 1000
  },
  reorderPoint: {
    type: Number,
    default: 20
  },
  reorderQuantity: {
    type: Number,
    default: 50
  },
  isLowStock: {
    type: Boolean,
    default: false
  },
  isOutOfStock: {
    type: Boolean,
    default: false
  },
  lastRestocked: Date,
  stockMovements: [stockMovementSchema],
  warehouse: {
    type: String,
    default: 'Main Warehouse'
  },
  location: {
    aisle: String,
    shelf: String,
    bin: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate available stock and status before saving
inventorySchema.pre('save', function(next) {
  this.availableStock = this.currentStock - this.reservedStock;
  if (this.availableStock < 0) this.availableStock = 0;
  
  this.isLowStock = this.currentStock <= this.minStockThreshold && this.currentStock > 0;
  this.isOutOfStock = this.currentStock <= 0;
  this.updatedAt = Date.now();
  next();
});

// Generate SKU if not provided
inventorySchema.pre('save', async function(next) {
  if (this.isNew && !this.sku) {
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    this.sku = `SKU${timestamp}${random}`;
  }
  next();
});

// Static method to update stock
inventorySchema.statics.updateStock = async function(productId, variant, quantity, type, reference, referenceId, userId, reason) {
  let inventory = await this.findOne({
    product: productId,
    'variant.size': variant?.size,
    'variant.color': variant?.color
  });

  if (!inventory) {
    inventory = new this({
      product: productId,
      variant: variant,
      currentStock: 0
    });
  }

  const previousStock = inventory.currentStock;
  
  if (type === 'OUT') {
    inventory.currentStock -= quantity;
  } else {
    inventory.currentStock += quantity;
  }
  
  if (inventory.currentStock < 0) inventory.currentStock = 0;

  inventory.stockMovements.push({
    type,
    quantity,
    previousStock,
    newStock: inventory.currentStock,
    reason,
    reference,
    referenceId,
    performedBy: userId
  });

  if (type === 'IN') {
    inventory.lastRestocked = Date.now();
  }

  await inventory.save();
  return inventory;
};

module.exports = mongoose.model('Inventory', inventorySchema);
