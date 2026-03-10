const mongoose = require('mongoose');

const userImageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  // Analysis status
  status: {
    type: String,
    enum: ['uploaded', 'processing', 'analyzed', 'failed', 'deleted'],
    default: 'uploaded'
  },
  // Related size profile
  sizeProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SizeProfile'
  },
  // Image quality metrics
  quality: {
    isFullBody: { type: Boolean },
    isFrontFacing: { type: Boolean },
    hasGoodLighting: { type: Boolean },
    resolution: {
      width: { type: Number },
      height: { type: Number }
    }
  },
  // Error messages if analysis failed
  errorMessage: {
    type: String
  },
  // Privacy - auto delete after analysis
  isTemporary: {
    type: Boolean,
    default: true
  },
  // Will be deleted 1 hour after upload
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    },
    index: { expireAfterSeconds: 0 }
  }
}, {
  timestamps: true
});

// Method to mark as processed
userImageSchema.methods.markAsProcessed = async function(sizeProfileId) {
  this.status = 'analyzed';
  this.sizeProfile = sizeProfileId;
  await this.save();
};

// Method to mark as failed
userImageSchema.methods.markAsFailed = async function(errorMessage) {
  this.status = 'failed';
  this.errorMessage = errorMessage;
  await this.save();
};

module.exports = mongoose.model('UserImage', userImageSchema);
