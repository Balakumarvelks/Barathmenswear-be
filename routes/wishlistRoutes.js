const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  isInWishlist,
  clearWishlist
} = require('../controllers/wishlistController');

// Get wishlist
router.get('/', protect, getWishlist);

// Add to wishlist
router.post('/add', protect, addToWishlist);

// Check if in wishlist
router.get('/:productId', protect, isInWishlist);

// Remove from wishlist
router.delete('/:productId', protect, removeFromWishlist);

// Clear wishlist
router.delete('/', protect, clearWishlist);

module.exports = router;
