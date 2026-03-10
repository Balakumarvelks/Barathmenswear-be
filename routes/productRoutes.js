const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  getCategories,
  getBrands,
  createProduct,
  updateProduct,
  addVariant,
  updateVariant,
  removeVariant,
  addImage,
  removeImage,
  deleteProduct,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/', getProducts);
router.get('/categories', getCategories);
router.get('/brands', getBrands);
router.get('/:id', getProduct);

// Admin routes - Protect and authorize admin
router.post('/', protect, authorize('admin'), createProduct);
router.put('/:id', protect, authorize('admin'), updateProduct);
router.delete('/:id', protect, authorize('admin'), deleteProduct);

// Variant management routes
router.post('/:id/variants', protect, authorize('admin'), addVariant);
router.put('/:id/variants/:variantId', protect, authorize('admin'), updateVariant);
router.delete('/:id/variants/:variantId', protect, authorize('admin'), removeVariant);

// Image management routes
router.post('/:id/images', protect, authorize('admin'), addImage);
router.delete('/:id/images/:imageId', protect, authorize('admin'), removeImage);

// Category management routes
router.post('/categories', protect, authorize('admin'), createCategory);
router.put('/categories/:id', protect, authorize('admin'), updateCategory);
router.delete('/categories/:id', protect, authorize('admin'), deleteCategory);

module.exports = router;
