const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');
const Category = require('./models/Category');
const User = require('./models/User');

dotenv.config();

const shirtSizes = ['S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'];
const pantWaistSizes = ['28', '30', '32', '34', '36', '38', '40', '42', '44'];
const tshirtSizes = ['S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'];

function buildVariants(sizes, stockPerSize, colors) {
  const variants = [];
  for (const size of sizes) {
    for (const color of colors) {
      variants.push({
        _id: new mongoose.Types.ObjectId(),
        size,
        color,
        stock: stockPerSize
      });
    }
  }
  return variants;
}

const seedProducts = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    // Find admin user for createdBy
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.error('No admin user found. Run seedAdmin.js first.');
      process.exit(1);
    }

    // ── Create Categories ──
    const categoryData = [
      { name: 'Shirts', description: 'Formal and casual shirts for men' },
      { name: 'Pants', description: 'Formal trousers, jeans, cargo and casual pants' },
      { name: 'T-Shirts', description: 'Casual and polo T-shirts for men' },
      { name: 'Track Pants', description: 'Comfortable track pants for gym and sports' },
      { name: 'Shorts', description: 'Casual and denim shorts for men' }
    ];

    const categories = {};
    for (const cat of categoryData) {
      let existing = await Category.findOne({ name: cat.name });
      if (!existing) {
        existing = await Category.create(cat);
        console.log(`Created category: ${cat.name}`);
      } else {
        console.log(`Category already exists: ${cat.name}`);
      }
      categories[cat.name] = existing._id;
    }

    // ── Product Definitions ──
    const products = [
      // ─── SHIRTS ───
      {
        name: 'R-2 Casual Check Shirt',
        description: 'Stylish casual cotton blend shirt for daily wear and college use. Features a modern check pattern with comfortable half-sleeve design. Made from premium cotton blend fabric that keeps you cool throughout the day.',
        price: 799,
        category: categories['Shirts'],
        brand: 'R-2',
        stock: 60,
        tags: ['shirt', 'casual', 'check', 'half-sleeve', 'cotton', 'R-2'],
        variants: buildVariants(shirtSizes, 8, ['Blue Check', 'Red Check', 'Green Check']),
        images: [{ _id: new mongoose.Types.ObjectId(), url: 'https://res.cloudinary.com/demo/image/upload/v1/barath-mens-wear/products/r2-casual-check-shirt.jpg', alt: 'R-2 Casual Check Shirt', isPrimary: true }]
      },
      {
        name: 'R-2 Solid Formal Shirt',
        description: 'Premium solid formal shirt with comfortable fit and durable stitching. Full-sleeve design perfect for office wear and formal occasions. Crafted with attention to detail for a sharp professional look.',
        price: 899,
        category: categories['Shirts'],
        brand: 'R-2',
        stock: 50,
        tags: ['shirt', 'formal', 'solid', 'full-sleeve', 'R-2'],
        variants: buildVariants(shirtSizes, 7, ['White', 'Light Blue', 'Grey']),
        images: [{ _id: new mongoose.Types.ObjectId(), url: 'https://res.cloudinary.com/demo/image/upload/v1/barath-mens-wear/products/r2-solid-formal-shirt.jpg', alt: 'R-2 Solid Formal Shirt', isPrimary: true }]
      },
      {
        name: 'Allen Solly Slim Fit Shirt',
        description: 'Premium cotton formal shirt ideal for office and meetings. Allen Solly quality with a slim fit cut that provides a modern silhouette. Full-sleeve design with fine stitching and superior fabric quality.',
        price: 1299,
        category: categories['Shirts'],
        brand: 'Allen Solly',
        stock: 40,
        tags: ['shirt', 'formal', 'slim-fit', 'full-sleeve', 'Allen Solly', 'premium'],
        variants: buildVariants(shirtSizes, 5, ['White', 'Sky Blue', 'Pink']),
        images: [{ _id: new mongoose.Types.ObjectId(), url: 'https://res.cloudinary.com/demo/image/upload/v1/barath-mens-wear/products/allen-solly-slim-fit-shirt.jpg', alt: 'Allen Solly Slim Fit Shirt', isPrimary: true }]
      },
      {
        name: 'Allen Solly Casual Shirt',
        description: 'Trendy casual shirt with soft breathable fabric. Half-sleeve design from Allen Solly that combines style with comfort. Perfect for weekend outings and casual gatherings.',
        price: 1199,
        category: categories['Shirts'],
        brand: 'Allen Solly',
        stock: 35,
        tags: ['shirt', 'casual', 'half-sleeve', 'Allen Solly', 'breathable'],
        variants: buildVariants(shirtSizes, 5, ['Navy', 'Olive', 'Maroon']),
        images: [{ _id: new mongoose.Types.ObjectId(), url: 'https://res.cloudinary.com/demo/image/upload/v1/barath-mens-wear/products/allen-solly-casual-shirt.jpg', alt: 'Allen Solly Casual Shirt', isPrimary: true }]
      },
      {
        name: 'Louis Philippe Premium Shirt',
        description: 'Elegant corporate shirt with tailored finish. Louis Philippe craftsmanship with premium fabric and impeccable stitching. Full-sleeve design suited for boardroom meetings and formal events.',
        price: 1599,
        category: categories['Shirts'],
        brand: 'Louis Philippe',
        stock: 30,
        tags: ['shirt', 'formal', 'premium', 'full-sleeve', 'Louis Philippe', 'corporate'],
        variants: buildVariants(shirtSizes, 4, ['White', 'Light Blue', 'Lavender']),
        images: [{ _id: new mongoose.Types.ObjectId(), url: 'https://res.cloudinary.com/demo/image/upload/v1/barath-mens-wear/products/louis-philippe-premium-shirt.jpg', alt: 'Louis Philippe Premium Shirt', isPrimary: true }]
      },
      {
        name: 'US Polo Casual Shirt',
        description: 'Smart casual shirt with premium branding. Half-sleeve design from US Polo with signature logo and comfortable fabric. Ideal for semi-formal and casual occasions.',
        price: 1399,
        category: categories['Shirts'],
        brand: 'US Polo',
        stock: 45,
        tags: ['shirt', 'casual', 'half-sleeve', 'US Polo', 'branded'],
        variants: buildVariants(shirtSizes, 6, ['Blue', 'White', 'Green']),
        images: [{ _id: new mongoose.Types.ObjectId(), url: 'https://res.cloudinary.com/demo/image/upload/v1/barath-mens-wear/products/us-polo-casual-shirt.jpg', alt: 'US Polo Casual Shirt', isPrimary: true }]
      },
      {
        name: 'Otto Formal Shirt',
        description: 'Comfortable formal shirt suitable for office and events. Full-sleeve design from Otto with wrinkle-resistant fabric. Offers great value with premium finish and comfortable fit.',
        price: 999,
        category: categories['Shirts'],
        brand: 'Otto',
        stock: 50,
        tags: ['shirt', 'formal', 'full-sleeve', 'Otto', 'office-wear'],
        variants: buildVariants(shirtSizes, 7, ['White', 'Blue', 'Grey']),
        images: [{ _id: new mongoose.Types.ObjectId(), url: 'https://res.cloudinary.com/demo/image/upload/v1/barath-mens-wear/products/otto-formal-shirt.jpg', alt: 'Otto Formal Shirt', isPrimary: true }]
      },

      // ─── PANTS ───
      {
        name: 'Classic Cotton Formal Pant',
        description: 'Office-ready cotton trousers with comfortable regular fit. Made from premium cotton fabric that offers all-day comfort. Features a classic design suitable for professional settings.',
        price: 1199,
        category: categories['Pants'],
        brand: 'Barath Collection',
        stock: 70,
        tags: ['pant', 'formal', 'cotton', 'regular-fit', 'office-wear', 'trouser'],
        variants: buildVariants(pantWaistSizes, 7, ['Black', 'Navy', 'Grey']),
        images: [{ _id: new mongoose.Types.ObjectId(), url: 'https://res.cloudinary.com/demo/image/upload/v1/barath-mens-wear/products/classic-cotton-formal-pant.jpg', alt: 'Classic Cotton Formal Pant', isPrimary: true }]
      },
      {
        name: 'Slim Fit Stretch Jeans',
        description: 'Modern stretchable denim jeans for casual wear. Slim fit design with premium stretch fabric for maximum comfort and mobility. Trendy look perfect for outings and everyday style.',
        price: 1499,
        category: categories['Pants'],
        brand: 'Barath Collection',
        stock: 65,
        tags: ['jeans', 'slim-fit', 'stretch', 'denim', 'casual'],
        variants: buildVariants(pantWaistSizes, 7, ['Dark Blue', 'Black', 'Light Blue']),
        images: [{ _id: new mongoose.Types.ObjectId(), url: 'https://res.cloudinary.com/demo/image/upload/v1/barath-mens-wear/products/slim-fit-stretch-jeans.jpg', alt: 'Slim Fit Stretch Jeans', isPrimary: true }]
      },
      {
        name: 'Blue Regular Fit Jeans',
        description: 'Durable denim jeans suitable for daily use. Regular fit design with classic blue wash that never goes out of style. Heavy-duty stitching ensures long-lasting wear.',
        price: 1399,
        category: categories['Pants'],
        brand: 'Barath Collection',
        stock: 55,
        tags: ['jeans', 'regular-fit', 'denim', 'blue', 'daily-wear'],
        variants: buildVariants(pantWaistSizes, 6, ['Blue', 'Dark Blue']),
        images: [{ _id: new mongoose.Types.ObjectId(), url: 'https://res.cloudinary.com/demo/image/upload/v1/barath-mens-wear/products/blue-regular-fit-jeans.jpg', alt: 'Blue Regular Fit Jeans', isPrimary: true }]
      },
      {
        name: 'Olive Cargo Pant',
        description: 'Multi-pocket cargo pant perfect for travel and casual outings. Regular fit with durable fabric and multiple utility pockets. Rugged design that combines functionality with style.',
        price: 1399,
        category: categories['Pants'],
        brand: 'Barath Collection',
        stock: 40,
        tags: ['cargo', 'pant', 'regular-fit', 'multi-pocket', 'travel', 'olive'],
        variants: buildVariants(pantWaistSizes, 4, ['Olive', 'Khaki', 'Black']),
        images: [{ _id: new mongoose.Types.ObjectId(), url: 'https://res.cloudinary.com/demo/image/upload/v1/barath-mens-wear/products/olive-cargo-pant.jpg', alt: 'Olive Cargo Pant', isPrimary: true }]
      },
      {
        name: 'Trendy Baggy Pant',
        description: 'Modern loose-fit pants for stylish street look. Baggy design with elastic waistband for ultimate comfort. Perfect for streetwear enthusiasts and casual fashion lovers.',
        price: 1099,
        category: categories['Pants'],
        brand: 'Barath Collection',
        stock: 35,
        tags: ['baggy', 'pant', 'loose-fit', 'streetwear', 'trendy'],
        variants: buildVariants(pantWaistSizes, 3, ['Black', 'Grey', 'Beige']),
        images: [{ _id: new mongoose.Types.ObjectId(), url: 'https://res.cloudinary.com/demo/image/upload/v1/barath-mens-wear/products/trendy-baggy-pant.jpg', alt: 'Trendy Baggy Pant', isPrimary: true }]
      },
      {
        name: 'Polo Fit Formal Trouser',
        description: 'Premium tailored trousers for formal occasions. Slim fit polo design with fine fabric and excellent drape. Ideal for office, interviews, and formal events.',
        price: 1299,
        category: categories['Pants'],
        brand: 'Barath Collection',
        stock: 45,
        tags: ['trouser', 'formal', 'slim-fit', 'polo-fit', 'tailored'],
        variants: buildVariants(pantWaistSizes, 5, ['Black', 'Navy', 'Charcoal']),
        images: [{ _id: new mongoose.Types.ObjectId(), url: 'https://res.cloudinary.com/demo/image/upload/v1/barath-mens-wear/products/polo-fit-formal-trouser.jpg', alt: 'Polo Fit Formal Trouser', isPrimary: true }]
      },
      {
        name: 'Gurga Cotton Pant',
        description: 'Soft cotton pant suitable for semi-formal and traditional wear. Regular fit with lightweight cotton fabric that is comfortable in all seasons. Versatile design for multiple occasions.',
        price: 999,
        category: categories['Pants'],
        brand: 'Barath Collection',
        stock: 50,
        tags: ['pant', 'cotton', 'regular-fit', 'semi-formal', 'traditional', 'gurga'],
        variants: buildVariants(pantWaistSizes, 5, ['Cream', 'Brown', 'Grey']),
        images: [{ _id: new mongoose.Types.ObjectId(), url: 'https://res.cloudinary.com/demo/image/upload/v1/barath-mens-wear/products/gurga-cotton-pant.jpg', alt: 'Gurga Cotton Pant', isPrimary: true }]
      },

      // ─── T-SHIRTS ───
      {
        name: 'Round Neck Cotton T-Shirt',
        description: 'Soft cotton T-shirt suitable for daily wear. Classic round neck design with comfortable fit and breathable fabric. Available in multiple colors for everyday casual styling.',
        price: 699,
        category: categories['T-Shirts'],
        brand: 'Barath Collection',
        stock: 75,
        tags: ['tshirt', 'casual', 'round-neck', 'cotton', 'daily-wear'],
        variants: buildVariants(tshirtSizes, 10, ['Black', 'White', 'Navy', 'Grey']),
        images: [{ _id: new mongoose.Types.ObjectId(), url: 'https://res.cloudinary.com/demo/image/upload/v1/barath-mens-wear/products/round-neck-cotton-tshirt.jpg', alt: 'Round Neck Cotton T-Shirt', isPrimary: true }]
      },
      {
        name: 'Polo Collar T-Shirt',
        description: 'Stylish polo T-shirt with modern fit. Features a classic collar design with button placket and premium fabric. Perfect for casual outings and semi-formal gatherings.',
        price: 899,
        category: categories['T-Shirts'],
        brand: 'Barath Collection',
        stock: 60,
        tags: ['tshirt', 'polo', 'collar', 'modern-fit', 'stylish'],
        variants: buildVariants(tshirtSizes, 8, ['Black', 'Navy', 'Maroon', 'White']),
        images: [{ _id: new mongoose.Types.ObjectId(), url: 'https://res.cloudinary.com/demo/image/upload/v1/barath-mens-wear/products/polo-collar-tshirt.jpg', alt: 'Polo Collar T-Shirt', isPrimary: true }]
      },

      // ─── TRACK PANTS ───
      {
        name: 'Gym Track Pant',
        description: 'Stretchable and comfortable track pant for gym and sports. Made from moisture-wicking fabric with elastic waistband and zippered pockets. Ideal for workouts, jogging, and active lifestyle.',
        price: 899,
        category: categories['Track Pants'],
        brand: 'Barath Collection',
        stock: 70,
        tags: ['track-pant', 'gym', 'sports', 'stretchable', 'active-wear'],
        variants: buildVariants(tshirtSizes, 10, ['Black', 'Navy', 'Grey']),
        images: [{ _id: new mongoose.Types.ObjectId(), url: 'https://res.cloudinary.com/demo/image/upload/v1/barath-mens-wear/products/gym-track-pant.jpg', alt: 'Gym Track Pant', isPrimary: true }]
      },
      {
        name: 'Casual Jogger Track',
        description: 'Comfortable jogger-style track pant with elastic waist. Features tapered leg design with ribbed ankle cuffs. Perfect for casual wear, lounging, and light workouts.',
        price: 999,
        category: categories['Track Pants'],
        brand: 'Barath Collection',
        stock: 50,
        tags: ['track-pant', 'jogger', 'casual', 'elastic-waist', 'comfortable'],
        variants: buildVariants(tshirtSizes, 7, ['Black', 'Grey', 'Olive']),
        images: [{ _id: new mongoose.Types.ObjectId(), url: 'https://res.cloudinary.com/demo/image/upload/v1/barath-mens-wear/products/casual-jogger-track.jpg', alt: 'Casual Jogger Track', isPrimary: true }]
      },

      // ─── SHORTS ───
      {
        name: 'Cotton Casual Shorts',
        description: 'Lightweight summer shorts with breathable fabric. Made from pure cotton with elastic waistband and side pockets. Perfect for hot weather, beach outings, and casual home wear.',
        price: 599,
        category: categories['Shorts'],
        brand: 'Barath Collection',
        stock: 80,
        tags: ['shorts', 'casual', 'cotton', 'summer', 'lightweight', 'breathable'],
        variants: buildVariants(tshirtSizes, 11, ['Black', 'Navy', 'Grey', 'Khaki']),
        images: [{ _id: new mongoose.Types.ObjectId(), url: 'https://res.cloudinary.com/demo/image/upload/v1/barath-mens-wear/products/cotton-casual-shorts.jpg', alt: 'Cotton Casual Shorts', isPrimary: true }]
      },
      {
        name: 'Denim Shorts',
        description: 'Stylish denim shorts for casual outings. Made from quality denim fabric with classic five-pocket design. Ideal for summer casual look and weekend outings.',
        price: 799,
        category: categories['Shorts'],
        brand: 'Barath Collection',
        stock: 60,
        tags: ['shorts', 'denim', 'casual', 'stylish', 'summer'],
        variants: buildVariants(tshirtSizes, 8, ['Blue', 'Dark Blue', 'Black']),
        images: [{ _id: new mongoose.Types.ObjectId(), url: 'https://res.cloudinary.com/demo/image/upload/v1/barath-mens-wear/products/denim-shorts.jpg', alt: 'Denim Shorts', isPrimary: true }]
      }
    ];

    // ── Insert Products ──
    let created = 0;
    let skipped = 0;

    for (const prod of products) {
      const exists = await Product.findOne({ name: prod.name });
      if (exists) {
        console.log(`⏭  Product already exists: ${prod.name}`);
        skipped++;
        continue;
      }

      await Product.create({
        ...prod,
        createdBy: admin._id
      });
      console.log(`✅ Created: ${prod.name} — ₹${prod.price}`);
      created++;
    }

    console.log('\n══════════════════════════════════════');
    console.log(`✅ Products created: ${created}`);
    console.log(`⏭  Products skipped (already exist): ${skipped}`);
    console.log(`📁 Categories: ${Object.keys(categories).join(', ')}`);
    console.log('══════════════════════════════════════');
    console.log('\n⚠️  Note: Product images use placeholder URLs.');
    console.log('   Upload real images via the Admin Panel or replace URLs in the database.');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding products:', error.message);
    process.exit(1);
  }
};

seedProducts();
