const express = require('express');
const router = express.Router();
const { getProductReviews, addReview, deleteReview } = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

// Public - get reviews for a product
router.get('/:productId', getProductReviews);

// Private - add a review
router.post('/:productId', protect, addReview);

// Private - delete a review
router.delete('/:reviewId', protect, deleteReview);

module.exports = router;
