const mongoose = require('mongoose');

const sizeProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  sessionId: {
    type: String,
    index: true
  },
  // Physical attributes (manual input)
  height: {
    type: Number, // in cm
    min: 100,
    max: 250
  },
  weight: {
    type: Number, // in kg
    min: 30,
    max: 200
  },
  // AI-detected body measurements (in cm)
  measurements: {
    shoulder: { type: Number },
    chest: { type: Number },
    waist: { type: Number },
    hip: { type: Number },
    armLength: { type: Number },
    legLength: { type: Number },
    torsoLength: { type: Number },
    neckCircumference: { type: Number },
    thigh: { type: Number }
  },
  // Body proportions calculated from image
  bodyProportions: {
    shoulderToHipRatio: { type: Number },
    waistToHipRatio: { type: Number },
    torsoToLegRatio: { type: Number }
  },
  // Recommended sizes based on analysis
  recommendedSizes: {
    shirt: {
      size: { type: String },
      fitType: { type: String, enum: ['slim', 'regular', 'relaxed'] },
      confidence: { type: Number, min: 0, max: 100 }
    },
    pant: {
      waistSize: { type: String },
      fitType: { type: String, enum: ['slim', 'regular', 'relaxed'] },
      length: { type: String },
      confidence: { type: Number, min: 0, max: 100 }
    },
    tshirt: {
      size: { type: String },
      fitType: { type: String, enum: ['slim', 'regular', 'relaxed'] },
      confidence: { type: Number, min: 0, max: 100 }
    }
  },
  // Body type classification
  bodyType: {
    type: String,
    enum: ['ectomorph', 'mesomorph', 'endomorph', 'athletic', 'average']
  },
  // Analysis metadata
  analysisSource: {
    type: String,
    enum: ['image', 'manual', 'combined'],
    default: 'manual'
  },
  imageAnalyzed: {
    type: Boolean,
    default: false
  },
  analysisDate: {
    type: Date,
    default: Date.now
  },
  // For privacy - mark if profile should auto-delete
  autoDelete: {
    type: Boolean,
    default: true
  },
  deleteAfter: {
    type: Date,
    default: function() {
      // Auto-delete after 24 hours if autoDelete is true
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
  }
}, {
  timestamps: true
});

// Index for auto-deletion
sizeProfileSchema.index({ deleteAfter: 1 }, { expireAfterSeconds: 0 });

// Method to get size recommendation summary
sizeProfileSchema.methods.getSizeSummary = function() {
  return {
    shirtSize: this.recommendedSizes?.shirt?.size || 'Not determined',
    shirtFit: this.recommendedSizes?.shirt?.fitType || 'regular',
    pantSize: this.recommendedSizes?.pant?.waistSize || 'Not determined',
    pantFit: this.recommendedSizes?.pant?.fitType || 'regular',
    bodyType: this.bodyType || 'Not determined',
    confidence: Math.round(
      ((this.recommendedSizes?.shirt?.confidence || 0) + 
       (this.recommendedSizes?.pant?.confidence || 0)) / 2
    )
  };
};

module.exports = mongoose.model('SizeProfile', sizeProfileSchema);
