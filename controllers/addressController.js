const Address = require('../models/Address');

// @desc    Get user's addresses
// @route   GET /api/addresses
// @access  Private
exports.getAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ user: req.user.id }).sort({ isDefault: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: addresses.length,
      addresses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single address
// @route   GET /api/addresses/:id
// @access  Private
exports.getAddress = async (req, res) => {
  try {
    const address = await Address.findById(req.params.id);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    if (address.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this address'
      });
    }

    res.status(200).json({
      success: true,
      address
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create new address
// @route   POST /api/addresses
// @access  Private
exports.createAddress = async (req, res) => {
  try {
    const { type, fullName, phone, alternatePhone, street, landmark, city, state, pincode, isDefault } = req.body;

    // Validate required fields
    if (!fullName || !phone || !street || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    const address = await Address.create({
      user: req.user.id,
      type,
      fullName,
      phone,
      alternatePhone,
      street,
      landmark,
      city,
      state,
      pincode,
      isDefault: isDefault || false
    });

    res.status(201).json({
      success: true,
      message: 'Address created successfully',
      address
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update address
// @route   PUT /api/addresses/:id
// @access  Private
exports.updateAddress = async (req, res) => {
  try {
    let address = await Address.findById(req.params.id);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    if (address.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this address'
      });
    }

    const { type, fullName, phone, alternatePhone, street, landmark, city, state, pincode, isDefault } = req.body;

    address.type = type || address.type;
    address.fullName = fullName || address.fullName;
    address.phone = phone || address.phone;
    address.alternatePhone = alternatePhone || address.alternatePhone;
    address.street = street || address.street;
    address.landmark = landmark || address.landmark;
    address.city = city || address.city;
    address.state = state || address.state;
    address.pincode = pincode || address.pincode;
    address.isDefault = isDefault !== undefined ? isDefault : address.isDefault;

    address = await address.save();

    res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      address
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete address
// @route   DELETE /api/addresses/:id
// @access  Private
exports.deleteAddress = async (req, res) => {
  try {
    const address = await Address.findById(req.params.id);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    if (address.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this address'
      });
    }

    await Address.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Address deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Set default address
// @route   PUT /api/addresses/:id/default
// @access  Private
exports.setDefaultAddress = async (req, res) => {
  try {
    const address = await Address.findById(req.params.id);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    if (address.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this address'
      });
    }

    // Set all other addresses to non-default
    await Address.updateMany(
      { user: req.user.id, _id: { $ne: req.params.id } },
      { isDefault: false }
    );

    address.isDefault = true;
    await address.save();

    res.status(200).json({
      success: true,
      message: 'Default address updated',
      address
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
