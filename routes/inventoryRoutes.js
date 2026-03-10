const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getInventory,
  getInventoryItem,
  updateInventory,
  setThreshold,
  getLowStockAlerts,
  getOutOfStockItems,
  getStockMovements,
  updateStockByProduct
} = require('../controllers/inventoryController');

// Get inventory
router.get('/', protect, authorize('admin'), getInventory);

// Update stock by product ID
router.post('/update', protect, authorize('admin'), updateStockByProduct);

// Get low stock alerts
router.get('/alerts/low-stock', protect, authorize('admin'), getLowStockAlerts);

// Get out of stock items
router.get('/alerts/out-of-stock', protect, authorize('admin'), getOutOfStockItems);

// Get single inventory item
router.get('/:id', protect, authorize('admin'), getInventoryItem);

// Update inventory
router.put('/:id', protect, authorize('admin'), updateInventory);

// Set threshold
router.put('/:id/threshold', protect, authorize('admin'), setThreshold);

// Get stock movements
router.get('/:id/movements', protect, authorize('admin'), getStockMovements);

module.exports = router;
