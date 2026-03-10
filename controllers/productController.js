const Product = require('../models/Product');
const Category = require('../models/Category');
const mongoose = require('mongoose');

// @desc    Get all products with filters and search
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res) => {
  try {
    const { category, brand, minPrice, maxPrice, search, sort } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;

    // Build filter object
    const filter = { active: true };

    if (category) {
      // Check if category is a valid ObjectId or a category name
      if (mongoose.Types.ObjectId.isValid(category)) {
        filter.category = category;
      } else {
        // Look up the category by name
        const categoryDoc = await Category.findOne({ name: { $regex: new RegExp(`^${category}$`, 'i') } });
        if (categoryDoc) {
          filter.category = categoryDoc._id;
        } else {
          // No matching category found, return empty results
          return res.status(200).json({
            success: true,
            count: 0,
            total: 0,
            pages: 0,
            currentPage: page,
            products: []
          });
        }
      }
    }

    if (brand) {
      filter.brand = { $regex: brand, $options: 'i' };
    }

    if (minPrice || maxPrice) {
      filter.finalPrice = {};
      if (minPrice) filter.finalPrice.$gte = Number(minPrice);
      if (maxPrice) filter.finalPrice.$lte = Number(maxPrice);
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    // Determine sort order
    let sortOrder = {};
    if (sort) {
      switch (sort) {
        case 'price-asc':
          sortOrder = { finalPrice: 1 };
          break;
        case 'price-desc':
          sortOrder = { finalPrice: -1 };
          break;
        case 'newest':
          sortOrder = { createdAt: -1 };
          break;
        case 'rating':
          sortOrder = { 'ratings.average': -1 };
          break;
        default:
          sortOrder = { createdAt: -1 };
      }
    } else {
      sortOrder = { createdAt: -1 };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query
    const products = await Product.find(filter)
      .populate('category', 'name')
      .sort(sortOrder)
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Product.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name description');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ active: true });

    res.status(200).json({
      success: true,
      count: categories.length,
      categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get products by brand
// @route   GET /api/products/brands
// @access  Public
exports.getBrands = async (req, res) => {
  try {
    const brands = await Product.distinct('brand', { active: true });

    res.status(200).json({
      success: true,
      count: brands.length,
      brands: brands.sort()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create new product (Admin)
// @route   POST /api/admin/products
// @access  Admin
exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, discount, category, brand, stock, variants, images, tags } = req.body;

    // Validate required fields
    if (!name || !description || !price || !category || !brand || stock === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Validate category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const product = await Product.create({
      name,
      description,
      price,
      discount: discount || 0,
      category,
      brand,
      stock,
      variants: variants || [],
      images: images || [],
      tags: tags || [],
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update product (Admin)
// @route   PUT /api/admin/products/:id
// @access  Admin
exports.updateProduct = async (req, res) => {
  try {
    const { name, description, price, discount, category, brand, stock, active, tags } = req.body;

    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Validate category if provided
    if (category && category !== product.category.toString()) {
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }
    }

    // Update fields
    if (name) product.name = name;
    if (description) product.description = description;
    if (price) product.price = price;
    if (discount !== undefined) product.discount = discount;
    if (category) product.category = category;
    if (brand) product.brand = brand;
    if (stock !== undefined) product.stock = stock;
    if (active !== undefined) product.active = active;
    if (tags) product.tags = tags;

    product = await product.save();

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Add variant to product (Admin)
// @route   POST /api/admin/products/:id/variants
// @access  Admin
exports.addVariant = async (req, res) => {
  try {
    const { size, color, stock } = req.body;

    if (!size || !color || stock === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide size, color, and stock'
      });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if variant already exists
    const variantExists = product.variants.some(v => v.size === size && v.color === color);
    if (variantExists) {
      return res.status(400).json({
        success: false,
        message: 'This size and color combination already exists'
      });
    }

    product.variants.push({
      _id: new mongoose.Types.ObjectId(),
      size,
      color,
      stock
    });

    await product.save();

    res.status(200).json({
      success: true,
      message: 'Variant added successfully',
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update variant (Admin)
// @route   PUT /api/admin/products/:id/variants/:variantId
// @access  Admin
exports.updateVariant = async (req, res) => {
  try {
    const { size, color, stock } = req.body;

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const variant = product.variants.id(req.params.variantId);

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: 'Variant not found'
      });
    }

    if (size) variant.size = size;
    if (color) variant.color = color;
    if (stock !== undefined) variant.stock = stock;

    await product.save();

    res.status(200).json({
      success: true,
      message: 'Variant updated successfully',
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Remove variant (Admin)
// @route   DELETE /api/admin/products/:id/variants/:variantId
// @access  Admin
exports.removeVariant = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    product.variants.id(req.params.variantId).deleteOne();
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Variant removed successfully',
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Add image to product (Admin)
// @route   POST /api/admin/products/:id/images
// @access  Admin
exports.addImage = async (req, res) => {
  try {
    const { url, alt, isPrimary } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'Please provide image URL'
      });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // If this is the primary image, remove primary flag from others
    if (isPrimary) {
      product.images.forEach(img => {
        img.isPrimary = false;
      });
    }

    product.images.push({
      _id: new mongoose.Types.ObjectId(),
      url,
      alt: alt || '',
      isPrimary: isPrimary || product.images.length === 0
    });

    await product.save();

    res.status(200).json({
      success: true,
      message: 'Image added successfully',
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Remove image (Admin)
// @route   DELETE /api/admin/products/:id/images/:imageId
// @access  Admin
exports.removeImage = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (product.images.length === 1) {
      return res.status(400).json({
        success: false,
        message: 'Product must have at least one image'
      });
    }

    const image = product.images.id(req.params.imageId);
    if (image && image.isPrimary) {
      product.images[0].isPrimary = true;
    }

    product.images.id(req.params.imageId).deleteOne();
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Image removed successfully',
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete product (Admin)
// @route   DELETE /api/admin/products/:id
// @access  Admin
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Admin Category Management

// @desc    Create category (Admin)
// @route   POST /api/admin/categories
// @access  Admin
exports.createCategory = async (req, res) => {
  try {
    const { name, description, image } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide category name'
      });
    }

    const category = await Category.create({
      name,
      description: description || '',
      image: image || null
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update category (Admin)
// @route   PUT /api/admin/categories/:id
// @access  Admin
exports.updateCategory = async (req, res) => {
  try {
    const { name, description, image, active } = req.body;

    let category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    if (name) category.name = name;
    if (description) category.description = description;
    if (image) category.image = image;
    if (active !== undefined) category.active = active;

    category = await category.save();

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      category
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete category (Admin)
// @route   DELETE /api/admin/categories/:id
// @access  Admin
exports.deleteCategory = async (req, res) => {
  try {
    // Check if any products use this category
    const productsCount = await Product.countDocuments({ category: req.params.id });

    if (productsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. ${productsCount} product(s) are using this category.`
      });
    }

    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
