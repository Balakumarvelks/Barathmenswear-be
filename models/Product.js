const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide product name'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide product description'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Please provide product price'],
    min: [0, 'Price cannot be negative']
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%']
  },
  finalPrice: {
    type: Number,
    default: 0
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Please provide a category']
  },
  brand: {
    type: String,
    required: [true, 'Please provide brand name'],
    trim: true
  },
  stock: {
    type: Number,
    required: [true, 'Please provide stock quantity'],
    min: [0, 'Stock cannot be negative']
  },
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  variants: [
    {
      _id: mongoose.Schema.Types.ObjectId,
      size: {
        type: String,
        required: true
      },
      color: {
        type: String,
        required: true
      },
      stock: {
        type: Number,
        required: true,
        min: 0
      }
    }
  ],
  images: [
    {
      _id: mongoose.Schema.Types.ObjectId,
      url: {
        type: String,
        required: true
      },
      alt: {
        type: String,
        default: ''
      },
      isPrimary: {
        type: Boolean,
        default: false
      }
    }
  ],
  tags: [String],
  active: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate final price before saving
productSchema.pre('save', function(next) {
  this.finalPrice = this.price - (this.price * (this.discount / 100));
  this.updatedAt = Date.now();
  next();
});

// Populate category on find
productSchema.pre(/^find/, function(next) {
  if (this.options._recursed) return next();
  this.populate({
    path: 'category',
    select: 'name description'
  });
  next();
});

module.exports = mongoose.model('Product', productSchema);
