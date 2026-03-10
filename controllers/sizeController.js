const SizeProfile = require('../models/SizeProfile');
const SizeChart = require('../models/SizeChart');
const UserImage = require('../models/UserImage');
const Product = require('../models/Product');
const fs = require('fs');
const path = require('path');

// Generate unique session ID
const generateSessionId = () => {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// AI-based body measurement estimation (simulated - in production use ML model)
const analyzeBodyMeasurements = (height, weight, imageData = null) => {
  // Body measurement estimation based on height, weight, and body proportions
  // This is a rule-based approximation - in production, use TensorFlow/OpenCV
  
  const heightCm = height;
  const weightKg = weight;
  const bmi = weightKg / Math.pow(heightCm / 100, 2);
  
  // Determine body type based on BMI and proportions
  let bodyType = 'average';
  if (bmi < 18.5) {
    bodyType = 'ectomorph';
  } else if (bmi >= 18.5 && bmi < 25) {
    bodyType = bmi < 22 ? 'ectomorph' : 'mesomorph';
  } else if (bmi >= 25 && bmi < 30) {
    bodyType = 'mesomorph';
  } else {
    bodyType = 'endomorph';
  }
  
  // Estimate measurements based on height, weight, and body type
  const baseChest = heightCm * 0.52;
  const baseWaist = heightCm * 0.43;
  const baseShoulder = heightCm * 0.25;
  const baseHip = heightCm * 0.53;
  const baseArmLength = heightCm * 0.32;
  const baseLegLength = heightCm * 0.47;
  
  // Adjust based on weight and body type
  const weightFactor = (weightKg - 60) / 40; // Normalize weight
  const adjustmentFactor = 1 + (weightFactor * 0.15);
  
  let measurements = {
    chest: Math.round(baseChest * adjustmentFactor),
    waist: Math.round(baseWaist * adjustmentFactor),
    shoulder: Math.round(baseShoulder * adjustmentFactor),
    hip: Math.round(baseHip * adjustmentFactor),
    armLength: Math.round(baseArmLength),
    legLength: Math.round(baseLegLength),
    torsoLength: Math.round(heightCm * 0.3),
    neckCircumference: Math.round(heightCm * 0.22 * adjustmentFactor * 0.6),
    thigh: Math.round(heightCm * 0.32 * adjustmentFactor * 0.55)
  };
  
  // If image data is provided, simulate AI enhancement
  if (imageData) {
    // In production, this would use computer vision to refine measurements
    // For now, add slight random variation to simulate AI refinement
    const refinementFactor = 0.98 + Math.random() * 0.04;
    measurements.chest = Math.round(measurements.chest * refinementFactor);
    measurements.waist = Math.round(measurements.waist * refinementFactor);
    measurements.shoulder = Math.round(measurements.shoulder * refinementFactor);
  }
  
  // Calculate body proportions
  const bodyProportions = {
    shoulderToHipRatio: (measurements.shoulder / measurements.hip).toFixed(2),
    waistToHipRatio: (measurements.waist / measurements.hip).toFixed(2),
    torsoToLegRatio: (measurements.torsoLength / measurements.legLength).toFixed(2)
  };
  
  return { measurements, bodyType, bodyProportions };
};

// Map measurements to shirt size
const mapToShirtSize = (chest, shoulder, bodyType) => {
  // Chest-based size mapping (in cm)
  const sizeChart = [
    { size: 'XS', chest: { min: 81, max: 86 }, confidence: 90 },
    { size: 'S', chest: { min: 86, max: 91 }, confidence: 92 },
    { size: 'M', chest: { min: 91, max: 97 }, confidence: 95 },
    { size: 'L', chest: { min: 97, max: 102 }, confidence: 95 },
    { size: 'XL', chest: { min: 102, max: 107 }, confidence: 92 },
    { size: 'XXL', chest: { min: 107, max: 112 }, confidence: 90 },
    { size: '3XL', chest: { min: 112, max: 117 }, confidence: 88 },
    { size: '4XL', chest: { min: 117, max: 125 }, confidence: 85 }
  ];
  
  let recommendedSize = 'M';
  let confidence = 70;
  
  for (const entry of sizeChart) {
    if (chest >= entry.chest.min && chest <= entry.chest.max) {
      recommendedSize = entry.size;
      confidence = entry.confidence;
      break;
    } else if (chest < entry.chest.min && entry === sizeChart[0]) {
      recommendedSize = 'XS';
      confidence = 75;
      break;
    } else if (chest > entry.chest.max && entry === sizeChart[sizeChart.length - 1]) {
      recommendedSize = '4XL';
      confidence = 75;
    }
  }
  
  // Determine fit type based on body type
  let fitType = 'regular';
  if (bodyType === 'ectomorph') {
    fitType = 'slim';
  } else if (bodyType === 'endomorph') {
    fitType = 'relaxed';
  } else if (bodyType === 'mesomorph' || bodyType === 'athletic') {
    fitType = 'regular';
  }
  
  return { size: recommendedSize, fitType, confidence };
};

// Map measurements to pant size
const mapToPantSize = (waist, hip, legLength, bodyType) => {
  // Convert waist cm to inches (common pant sizing)
  const waistInches = Math.round(waist / 2.54);
  
  // Standard waist sizes
  const waistSizes = ['28', '30', '32', '34', '36', '38', '40', '42', '44'];
  
  // Find closest waist size
  let closestSize = '32';
  let minDiff = Infinity;
  
  for (const size of waistSizes) {
    const diff = Math.abs(parseInt(size) - waistInches);
    if (diff < minDiff) {
      minDiff = diff;
      closestSize = size;
    }
  }
  
  // Determine length
  let length = 'Regular';
  if (legLength < 75) {
    length = 'Short';
  } else if (legLength > 85) {
    length = 'Long';
  }
  
  // Determine fit type
  let fitType = 'regular';
  if (bodyType === 'ectomorph') {
    fitType = 'slim';
  } else if (bodyType === 'endomorph') {
    fitType = 'relaxed';
  }
  
  // Calculate confidence
  let confidence = 90;
  if (minDiff > 2) {
    confidence = 75;
  } else if (minDiff > 1) {
    confidence = 85;
  }
  
  return { waistSize: closestSize, fitType, length, confidence };
};

// @desc    Upload image for size analysis
// @route   POST /api/size/upload-image
// @access  Public
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image'
      });
    }
    
    const sessionId = req.body.sessionId || generateSessionId();
    const userId = req.user ? req.user._id : null;
    
    // Create user image record
    const userImage = await UserImage.create({
      user: userId,
      sessionId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      mimetype: req.file.mimetype,
      size: req.file.size,
      status: 'uploaded',
      quality: {
        isFullBody: true, // Would be determined by AI in production
        isFrontFacing: true,
        hasGoodLighting: true
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        imageId: userImage._id,
        sessionId,
        filename: userImage.filename
      }
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading image',
      error: error.message
    });
  }
};

// @desc    Analyze image and get body measurements
// @route   POST /api/size/analyze
// @access  Public
exports.analyzeImage = async (req, res) => {
  try {
    const { sessionId, imageId, height, weight } = req.body;
    
    // Use provided height/weight or defaults for image-only analysis
    const analysisHeight = height || 170;
    const analysisWeight = weight || 65;
    
    // Validate height and weight ranges if provided
    if (height && (height < 100 || height > 250)) {
      return res.status(400).json({
        success: false,
        message: 'Height must be between 100 and 250 cm'
      });
    }
    
    if (weight && (weight < 30 || weight > 200)) {
      return res.status(400).json({
        success: false,
        message: 'Weight must be between 30 and 200 kg'
      });
    }
    
    let userImage = null;
    let analysisSource = 'manual';
    
    // If image was uploaded, update its status
    if (imageId) {
      userImage = await UserImage.findById(imageId);
      if (userImage) {
        userImage.status = 'processing';
        await userImage.save();
        analysisSource = 'combined';
      }
    }
    
    // Analyze body measurements
    const { measurements, bodyType, bodyProportions } = analyzeBodyMeasurements(
      analysisHeight,
      analysisWeight,
      userImage ? true : null
    );
    
    // Get size recommendations
    const shirtSize = mapToShirtSize(measurements.chest, measurements.shoulder, bodyType);
    const pantSize = mapToPantSize(measurements.waist, measurements.hip, measurements.legLength, bodyType);
    
    // Create or update size profile
    const userId = req.user ? req.user._id : null;
    const profileSessionId = sessionId || generateSessionId();
    
    let sizeProfile = await SizeProfile.findOne({
      $or: [
        { user: userId, user: { $ne: null } },
        { sessionId: profileSessionId }
      ]
    });
    
    if (sizeProfile) {
      // Update existing profile
      sizeProfile.height = analysisHeight;
      sizeProfile.weight = analysisWeight;
      sizeProfile.measurements = measurements;
      sizeProfile.bodyProportions = bodyProportions;
      sizeProfile.bodyType = bodyType;
      sizeProfile.recommendedSizes = {
        shirt: shirtSize,
        pant: pantSize,
        tshirt: { ...shirtSize } // T-shirt sizing similar to shirt
      };
      sizeProfile.analysisSource = analysisSource;
      sizeProfile.imageAnalyzed = !!userImage;
      sizeProfile.analysisDate = new Date();
      await sizeProfile.save();
    } else {
      // Create new profile
      sizeProfile = await SizeProfile.create({
        user: userId,
        sessionId: profileSessionId,
        height: analysisHeight,
        weight: analysisWeight,
        measurements,
        bodyProportions,
        bodyType,
        recommendedSizes: {
          shirt: shirtSize,
          pant: pantSize,
          tshirt: { ...shirtSize }
        },
        analysisSource,
        imageAnalyzed: !!userImage
      });
    }
    
    // Update user image with analysis results
    if (userImage) {
      await userImage.markAsProcessed(sizeProfile._id);
    }
    
    res.status(200).json({
      success: true,
      message: 'Analysis completed successfully',
      data: {
        profileId: sizeProfile._id,
        sessionId: profileSessionId,
        measurements,
        bodyType,
        bodyProportions,
        recommendations: {
          shirt: {
            size: shirtSize.size,
            fitType: shirtSize.fitType,
            confidence: shirtSize.confidence
          },
          pant: {
            size: pantSize.waistSize,
            fitType: pantSize.fitType,
            length: pantSize.length,
            confidence: pantSize.confidence
          },
          tshirt: {
            size: shirtSize.size,
            fitType: shirtSize.fitType,
            confidence: shirtSize.confidence
          }
        },
        analysisSource
      }
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Error analyzing measurements',
      error: error.message
    });
  }
};

// @desc    Get size recommendation by profile ID
// @route   GET /api/size/recommendation/:profileId
// @access  Public
exports.getRecommendation = async (req, res) => {
  try {
    const { profileId } = req.params;
    
    const sizeProfile = await SizeProfile.findById(profileId);
    
    if (!sizeProfile) {
      return res.status(404).json({
        success: false,
        message: 'Size profile not found'
      });
    }
    
    const summary = sizeProfile.getSizeSummary();
    
    res.status(200).json({
      success: true,
      data: {
        profileId: sizeProfile._id,
        height: sizeProfile.height,
        weight: sizeProfile.weight,
        bodyType: sizeProfile.bodyType,
        recommendations: sizeProfile.recommendedSizes,
        summary,
        measurements: sizeProfile.measurements,
        analysisDate: sizeProfile.analysisDate
      }
    });
  } catch (error) {
    console.error('Get recommendation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recommendation',
      error: error.message
    });
  }
};

// @desc    Get size recommendation by session
// @route   GET /api/size/recommendation/session/:sessionId
// @access  Public
exports.getRecommendationBySession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const sizeProfile = await SizeProfile.findOne({ sessionId });
    
    if (!sizeProfile) {
      return res.status(404).json({
        success: false,
        message: 'Size profile not found for this session'
      });
    }
    
    const summary = sizeProfile.getSizeSummary();
    
    res.status(200).json({
      success: true,
      data: {
        profileId: sizeProfile._id,
        height: sizeProfile.height,
        weight: sizeProfile.weight,
        bodyType: sizeProfile.bodyType,
        recommendations: sizeProfile.recommendedSizes,
        summary,
        measurements: sizeProfile.measurements,
        analysisDate: sizeProfile.analysisDate
      }
    });
  } catch (error) {
    console.error('Get recommendation by session error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recommendation',
      error: error.message
    });
  }
};

// @desc    Get products matching recommended size
// @route   GET /api/size/products/recommended
// @access  Public
exports.getRecommendedProducts = async (req, res) => {
  try {
    const { profileId, sessionId, category } = req.query;
    
    // Get size profile
    let sizeProfile;
    if (profileId) {
      sizeProfile = await SizeProfile.findById(profileId);
    } else if (sessionId) {
      sizeProfile = await SizeProfile.findOne({ sessionId });
    }
    
    if (!sizeProfile) {
      return res.status(404).json({
        success: false,
        message: 'Size profile not found. Please complete size analysis first.'
      });
    }
    
    // Get recommended shirt size
    const recommendedShirtSize = sizeProfile.recommendedSizes?.shirt?.size;
    const recommendedPantSize = sizeProfile.recommendedSizes?.pant?.waistSize;
    
    // Build query for products with matching variants
    let query = { isActive: true };
    
    // Find products with matching variants
    const products = await Product.find(query)
      .populate('category', 'name')
      .lean();
    
    // Filter products that have matching size variants
    const matchingProducts = products.filter(product => {
      if (!product.variants || product.variants.length === 0) return false;
      
      return product.variants.some(variant => {
        // Check if size matches shirt or pant recommendation
        const sizeMatches = variant.size === recommendedShirtSize || 
                          variant.size === recommendedPantSize;
        return sizeMatches && variant.stock > 0;
      });
    });
    
    // Sort by relevance (products with both size and good stock first)
    matchingProducts.sort((a, b) => {
      const aMatch = a.variants.filter(v => 
        (v.size === recommendedShirtSize || v.size === recommendedPantSize) && v.stock > 0
      ).length;
      const bMatch = b.variants.filter(v => 
        (v.size === recommendedShirtSize || v.size === recommendedPantSize) && v.stock > 0
      ).length;
      return bMatch - aMatch;
    });
    
    res.status(200).json({
      success: true,
      count: matchingProducts.length,
      recommendedSizes: {
        shirt: recommendedShirtSize,
        pant: recommendedPantSize
      },
      products: matchingProducts.slice(0, 20) // Limit to 20 products
    });
  } catch (error) {
    console.error('Get recommended products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recommended products',
      error: error.message
    });
  }
};

// @desc    Get all size charts
// @route   GET /api/size/charts
// @access  Public
exports.getSizeCharts = async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = { isActive: true };
    if (category) {
      query.category = category;
    }
    
    const sizeCharts = await SizeChart.find(query).sort({ size: 1 });
    
    res.status(200).json({
      success: true,
      count: sizeCharts.length,
      data: sizeCharts
    });
  } catch (error) {
    console.error('Get size charts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching size charts',
      error: error.message
    });
  }
};

// @desc    Delete user's size profile (privacy)
// @route   DELETE /api/size/profile/:profileId
// @access  Public
exports.deleteProfile = async (req, res) => {
  try {
    const { profileId } = req.params;
    
    // Delete size profile
    const sizeProfile = await SizeProfile.findByIdAndDelete(profileId);
    
    if (!sizeProfile) {
      return res.status(404).json({
        success: false,
        message: 'Size profile not found'
      });
    }
    
    // Delete associated images
    const userImages = await UserImage.find({ sizeProfile: profileId });
    for (const image of userImages) {
      // Delete file from filesystem
      if (fs.existsSync(image.path)) {
        fs.unlinkSync(image.path);
      }
      await UserImage.findByIdAndDelete(image._id);
    }
    
    res.status(200).json({
      success: true,
      message: 'Size profile and associated data deleted successfully'
    });
  } catch (error) {
    console.error('Delete profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting profile',
      error: error.message
    });
  }
};

// @desc    Quick size recommendation (without image)
// @route   POST /api/size/quick-recommend
// @access  Public
exports.quickRecommend = async (req, res) => {
  try {
    const { height, weight } = req.body;
    
    if (!height || !weight) {
      return res.status(400).json({
        success: false,
        message: 'Height and weight are required'
      });
    }
    
    // Validate ranges
    if (height < 100 || height > 250) {
      return res.status(400).json({
        success: false,
        message: 'Height must be between 100 and 250 cm'
      });
    }
    
    if (weight < 30 || weight > 200) {
      return res.status(400).json({
        success: false,
        message: 'Weight must be between 30 and 200 kg'
      });
    }
    
    // Get measurements and recommendations
    const { measurements, bodyType, bodyProportions } = analyzeBodyMeasurements(height, weight);
    const shirtSize = mapToShirtSize(measurements.chest, measurements.shoulder, bodyType);
    const pantSize = mapToPantSize(measurements.waist, measurements.hip, measurements.legLength, bodyType);
    
    res.status(200).json({
      success: true,
      data: {
        bodyType,
        recommendations: {
          shirt: {
            size: shirtSize.size,
            fitType: shirtSize.fitType,
            confidence: shirtSize.confidence
          },
          pant: {
            size: pantSize.waistSize,
            fitType: pantSize.fitType,
            length: pantSize.length,
            confidence: pantSize.confidence
          },
          tshirt: {
            size: shirtSize.size,
            fitType: shirtSize.fitType,
            confidence: shirtSize.confidence
          }
        },
        measurements: {
          chest: measurements.chest,
          waist: measurements.waist,
          shoulder: measurements.shoulder,
          hip: measurements.hip
        },
        tips: getSizeTips(bodyType, shirtSize.fitType)
      }
    });
  } catch (error) {
    console.error('Quick recommend error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating recommendation',
      error: error.message
    });
  }
};

// Helper function to get size tips
const getSizeTips = (bodyType, fitType) => {
  const tips = {
    ectomorph: [
      'Slim fit shirts will complement your lean frame',
      'Avoid overly loose clothing that may appear baggy',
      'Consider structured shoulders in formal wear'
    ],
    mesomorph: [
      'Regular fit works well for your athletic build',
      'Most styles will suit your proportional frame',
      'Choose quality fabrics that drape well'
    ],
    endomorph: [
      'Relaxed fit provides comfort without being too loose',
      'Vertical patterns can create a lengthening effect',
      'Dark colors offer a slimming appearance'
    ],
    athletic: [
      'Look for shirts with room in the chest and shoulders',
      'Tapered fits work well if you have a narrow waist',
      'Stretch fabrics offer comfort and movement'
    ],
    average: [
      'Most standard sizes will fit you well',
      'Experiment with different fit types to find your preference',
      'Regular fit is a safe choice for most occasions'
    ]
  };
  
  return tips[bodyType] || tips.average;
};

// @desc    Seed initial size charts
// @route   POST /api/size/seed-charts
// @access  Admin
exports.seedSizeCharts = async (req, res) => {
  try {
    // Clear existing charts
    await SizeChart.deleteMany({});
    
    // Shirt size charts
    const shirtSizes = [
      { size: 'XS', chest: { min: 81, max: 86 }, shoulder: { min: 39, max: 41 }, length: { min: 65, max: 68 } },
      { size: 'S', chest: { min: 86, max: 91 }, shoulder: { min: 41, max: 43 }, length: { min: 68, max: 71 } },
      { size: 'M', chest: { min: 91, max: 97 }, shoulder: { min: 43, max: 45 }, length: { min: 71, max: 74 } },
      { size: 'L', chest: { min: 97, max: 102 }, shoulder: { min: 45, max: 47 }, length: { min: 74, max: 77 } },
      { size: 'XL', chest: { min: 102, max: 107 }, shoulder: { min: 47, max: 49 }, length: { min: 77, max: 80 } },
      { size: 'XXL', chest: { min: 107, max: 112 }, shoulder: { min: 49, max: 51 }, length: { min: 80, max: 83 } },
      { size: '3XL', chest: { min: 112, max: 117 }, shoulder: { min: 51, max: 53 }, length: { min: 83, max: 86 } },
      { size: '4XL', chest: { min: 117, max: 125 }, shoulder: { min: 53, max: 56 }, length: { min: 86, max: 89 } }
    ];
    
    for (const size of shirtSizes) {
      await SizeChart.create({
        category: 'shirt',
        size: size.size,
        measurements: {
          chest: size.chest,
          shoulder: size.shoulder,
          length: size.length
        },
        fitType: 'regular'
      });
    }
    
    // Pant size charts
    const pantSizes = ['28', '30', '32', '34', '36', '38', '40', '42', '44'];
    for (const size of pantSizes) {
      const waistCm = parseInt(size) * 2.54;
      await SizeChart.create({
        category: 'pant',
        size: size,
        measurements: {
          waist: { min: waistCm - 1, max: waistCm + 1 },
          hip: { min: waistCm + 8, max: waistCm + 12 }
        },
        fitType: 'regular'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Size charts seeded successfully'
    });
  } catch (error) {
    console.error('Seed size charts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error seeding size charts',
      error: error.message
    });
  }
};
