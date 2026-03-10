const mongoose = require('mongoose');
const sizeChartSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: ['shirt', 'pant', 't-shirt', 'formal-shirt', 'casual-shirt'],
    index: true
  },
  size: {
    type: String,
    required: true,
    enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '28', '30', '32', '34', '36', '38', '40', '42', '44']
  },
  measurements: {
    // For shirts
    chest: {
      min: { type: Number },
      max: { type: Number }
    },
    shoulder: {
      min: { type: Number },
      max: { type: Number }
    },
    length: {
      min: { type: Number },
      max: { type: Number }
    },
    sleeve: {
      min: { type: Number },
      max: { type: Number }
    },
    // For pants
    waist: {
      min: { type: Number },
      max: { type: Number }
    },
    hip: {
      min: { type: Number },
      max: { type: Number }
    },
    inseam: {
      min: { type: Number },
      max: { type: Number }
    },
    thigh: {
      min: { type: Number },
      max: { type: Number }
    }
  },
  fitType: {
    type: String,
    enum: ['slim', 'regular', 'relaxed', 'loose'],
    default: 'regular'
  },
  brand: {
    type: String,
    default: 'Barath'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});
sizeChartSchema.index({ category: 1, size: 1, fitType: 1 });
module.exports = mongoose.model('SizeChart', sizeChartSchema);
