const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} = require('../controllers/cartController');

// Get cart
router.get('/', protect, getCart);

// Add to cart
router.post('/add', protect, addToCart);

// Update cart item
router.put('/item/:itemId', protect, updateCartItem);

// Remove from cart
router.delete('/item/:itemId', protect, removeFromCart);

// Clear cart
router.delete('/', protect, clearCart);

module.exports = router;
