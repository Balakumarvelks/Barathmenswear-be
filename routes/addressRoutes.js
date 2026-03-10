const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getAddresses,
  getAddress,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
} = require('../controllers/addressController');

// Get all addresses
router.get('/', protect, getAddresses);

// Create address
router.post('/', protect, createAddress);

// Get single address
router.get('/:id', protect, getAddress);

// Update address
router.put('/:id', protect, updateAddress);

// Set default address
router.put('/:id/default', protect, setDefaultAddress);

// Delete address
router.delete('/:id', protect, deleteAddress);

module.exports = router;
