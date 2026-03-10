const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const upload = require('../middleware/upload');
const { uploadProductImage, uploadCategoryImage, deleteImage, getPublicIdFromUrl } = require('../config/cloudinary');
const { protect, authorize } = require('../middleware/auth');

// @desc    Upload product image to Cloudinary
// @route   POST /api/upload/product-image
// @access  Admin
router.post('/product-image', protect, authorize('admin'), uploadProductImage.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file'
      });
    }

    // Cloudinary returns the URL in req.file.path
    const imageUrl = req.file.path;

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      imageUrl: imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Upload multiple product images to Cloudinary
// @route   POST /api/upload/product-images
// @access  Admin
router.post('/product-images', protect, authorize('admin'), uploadProductImage.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please upload at least one image file'
      });
    }

    const uploadedImages = req.files.map(file => ({
      url: file.path,
      filename: file.filename
    }));

    res.status(200).json({
      success: true,
      message: `${req.files.length} image(s) uploaded successfully`,
      images: uploadedImages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Upload category image to Cloudinary
// @route   POST /api/upload/category-image
// @access  Admin
router.post('/category-image', protect, authorize('admin'), uploadCategoryImage.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file'
      });
    }

    const imageUrl = req.file.path;

    res.status(200).json({
      success: true,
      message: 'Category image uploaded successfully',
      imageUrl: imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Delete uploaded image from Cloudinary
// @route   DELETE /api/upload/image
// @access  Admin
router.delete('/image', protect, authorize('admin'), async (req, res) => {
  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Image URL is required'
      });
    }

    const publicId = getPublicIdFromUrl(imageUrl);
    
    if (publicId) {
      await deleteImage(publicId);
    }

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Delete uploaded image (legacy - local storage)
// @route   DELETE /api/upload/product-image/:filename
// @access  Admin
router.delete('/product-image/:filename', protect, authorize('admin'), async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads/products', filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.status(200).json({
        success: true,
        message: 'Image deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
