const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['HOME', 'WORK', 'OTHER'],
    default: 'HOME'
  },
  fullName: {
    type: String,
    required: [true, 'Please provide full name'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Please provide phone number'],
    match: [/^[0-9]{10}$/, 'Please provide valid 10-digit phone number']
  },
  alternatePhone: {
    type: String,
    match: [/^[0-9]{10}$/, 'Please provide valid 10-digit phone number']
  },
  street: {
    type: String,
    required: [true, 'Please provide street address'],
    trim: true
  },
  landmark: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    required: [true, 'Please provide city'],
    trim: true
  },
  state: {
    type: String,
    required: [true, 'Please provide state'],
    trim: true
  },
  pincode: {
    type: String,
    required: [true, 'Please provide pincode'],
    match: [/^[0-9]{6}$/, 'Please provide valid 6-digit pincode']
  },
  country: {
    type: String,
    default: 'India'
  },
  isDefault: {
    type: Boolean,
    default: false
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

// Ensure only one default address per user
addressSchema.pre('save', async function(next) {
  if (this.isDefault) {
    await this.constructor.updateMany(
      { user: this.user, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Address', addressSchema);
