const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const {
  uploadImage,
  analyzeImage,
  getRecommendation,
  getRecommendationBySession,
  getRecommendedProducts,
  getSizeCharts,
  deleteProfile,
  quickRecommend,
  seedSizeCharts
} = require('../controllers/sizeController');

const { protect, optionalAuth } = require('../middleware/auth');

// Ensure uploads directory for size images exists
const sizeUploadsDir = path.join(__dirname, '../uploads/size-images');
if (!fs.existsSync(sizeUploadsDir)) {
  fs.mkdirSync(sizeUploadsDir, { recursive: true });
}

// Configure multer for size image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, sizeUploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'size-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, webp)'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for body images
  },
  fileFilter: fileFilter
});

// Public routes
// POST /api/size/upload-image - Upload image for analysis
router.post('/upload-image', optionalAuth, upload.single('image'), uploadImage);

// POST /api/size/analyze - Analyze body measurements from image/inputs
router.post('/analyze', optionalAuth, analyzeImage);

// POST /api/size/quick-recommend - Quick recommendation without image
router.post('/quick-recommend', quickRecommend);

// GET /api/size/recommendation/:profileId - Get recommendation by profile ID
router.get('/recommendation/:profileId', getRecommendation);

// GET /api/size/recommendation/session/:sessionId - Get recommendation by session
router.get('/recommendation/session/:sessionId', getRecommendationBySession);

// GET /api/size/products/recommended - Get products matching recommended size
router.get('/products/recommended', getRecommendedProducts);

// GET /api/size/charts - Get size charts
router.get('/charts', getSizeCharts);

// DELETE /api/size/profile/:profileId - Delete size profile (privacy)
router.delete('/profile/:profileId', deleteProfile);

// Admin route to seed size charts
router.post('/seed-charts', protect, seedSizeCharts);

module.exports = router;
