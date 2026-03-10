const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Cart = require('../models/Cart');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const Address = require('../models/Address');
const Coupon = require('../models/Coupon');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const generateInvoiceHTML = require('../utils/invoiceTemplate');
const generateInvoicePDF = require('../utils/generateInvoicePDF');
const path = require('path');

// Logo path for email attachments
const logoPath = path.join(__dirname, '../uploads/products/logo.png');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res) => {
  try {
    const { shippingAddress, paymentMethod, couponCode } = req.body;

    // Validate shipping address
    if (!shippingAddress) {
      return res.status(400).json({
        success: false,
        message: 'Shipping address is required'
      });
    }

    // Get user's cart
    const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Prepare order items
    const orderItems = cart.items.map(item => ({
      product: item.product._id,
      name: item.product.name,
      image: item.product.images[0]?.url,
      variant: item.variant,
      quantity: item.quantity,
      price: item.price,
      total: item.price * item.quantity
    }));

    const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
    let discount = cart.discount || 0;
    let couponDiscount = 0;

    // Apply coupon if provided
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
      if (!coupon) {
        return res.status(400).json({
          success: false,
          message: 'Invalid coupon code'
        });
      }

      if (!coupon.isValid()) {
        return res.status(400).json({
          success: false,
          message: 'Coupon has expired or is not valid'
        });
      }

      const canUse = await coupon.canUserUse(req.user.id);
      if (!canUse.canUse) {
        return res.status(400).json({
          success: false,
          message: canUse.message
        });
      }

      couponDiscount = coupon.calculateDiscount(subtotal);
    }

    const shippingCharges = subtotal > 500 ? 0 : 50; // Free shipping above 500
    const tax = Math.ceil((subtotal - discount - couponDiscount) * 0.05); // 5% tax
    const totalAmount = subtotal - discount - couponDiscount + shippingCharges + tax;

    // Create order
    const order = new Order({
      user: req.user.id,
      items: orderItems,
      shippingAddress,
      paymentMethod: paymentMethod || 'COD',
      subtotal,
      discount,
      couponCode: couponCode?.toUpperCase(),
      couponDiscount,
      shippingCharges,
      tax,
      totalAmount,
      estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days from now
    });

    await order.save();

    // Create payment record
    const payment = new Payment({
      order: order._id,
      user: req.user.id,
      amount: totalAmount,
      method: paymentMethod || 'COD',
      status: paymentMethod === 'COD' ? 'PENDING' : 'INITIATED'
    });

    await payment.save();

    // Update inventory
    for (const item of orderItems) {
      await Inventory.updateStock(
        item.product,
        item.variant,
        item.quantity,
        'OUT',
        'ORDER',
        order._id,
        req.user.id,
        `Order ${order.orderNumber} placed`
      );

      // Update product stock
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: -item.quantity } }
      );
    }

    // Update coupon usage
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
      coupon.usedCount += 1;
      coupon.usedBy.push({
        user: req.user.id,
        order: order._id
      });
      await coupon.save();
    }

    // Clear cart
    cart.items = [];
    cart.totalItems = 0;
    cart.totalPrice = 0;
    cart.finalPrice = 0;
    await cart.save();

    // Send invoice email with PDF attachment
    // Only send immediately for COD. For ONLINE, email is sent after payment success.
    if (paymentMethod === 'COD') {
      try {
        const user = await User.findById(req.user.id);
        if (user && user.email) {
          // Generate PDF invoice
          const pdfBuffer = await generateInvoicePDF(order);
          const invoiceHTML = generateInvoiceHTML(order, user);

          await sendEmail({
            email: user.email,
            subject: `Invoice for Order #${order.orderNumber} - Barath Mens Wear`,
            html: invoiceHTML,
            attachments: [
              {
                filename: `Invoice_${order.orderNumber}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
              }
            ]
          });
          console.log(`Invoice PDF email sent to ${user.email} for order ${order.orderNumber}`);
        }
      } catch (emailError) {
        console.error('Failed to send invoice email:', emailError.message);
        // Don't fail the order if email fails
      }
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order,
      payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get user's orders
// @route   GET /api/orders
// @access  Private
exports.getUserOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const filter = { user: req.user.id };
    if (status) {
      filter.orderStatus = status;
    }

    const skip = (page - 1) * limit;

    const orders = await Order.find(filter)
      .populate('user', 'firstName lastName email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Order.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'firstName lastName email phone')
      .populate('items.product', 'name price images');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify user owns this order OR user is admin
    if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order'
      });
    }

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
exports.cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this order'
      });
    }

    if (['DELIVERED', 'CANCELLED', 'RETURNED'].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel this order'
      });
    }

    order.orderStatus = 'CANCELLED';
    order.cancelledAt = Date.now();
    order.cancellationReason = reason;

    if (order.paymentStatus === 'PAID') {
      order.refundStatus = 'PENDING';
      order.refundAmount = order.totalAmount;
    }

    await order.save();

    // Restore inventory
    for (const item of order.items) {
      await Inventory.updateStock(
        item.product,
        item.variant,
        item.quantity,
        'IN',
        'RETURN',
        order._id,
        req.user.id,
        `Order ${order.orderNumber} cancelled - inventory restored`
      );

      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: item.quantity } }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all orders (Admin)
// @route   GET /api/orders/admin/all
// @access  Private/Admin
exports.getAllOrders = async (req, res) => {
  try {
    const { status, paymentStatus, page = 1, limit = 10, search } = req.query;

    let query = {};

    if (status) {
      query.orderStatus = status.toUpperCase();
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus.toUpperCase();
    }

    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Order.countDocuments(query);

    const orders = await Order.find(query)
      .populate('user', 'name email phone')
      .populate('items.product', 'name images')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      orders,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update order status (Admin)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ['PLACED', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED'];
    const statusUpper = status.toUpperCase();

    if (!validStatuses.includes(statusUpper)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update status
    order.orderStatus = statusUpper;

    // Add to status history
    order.statusHistory.push({
      status: statusUpper,
      timestamp: new Date(),
      updatedBy: req.user.id
    });

    // If delivered, update delivered date and payment
    if (statusUpper === 'DELIVERED') {
      order.deliveredAt = new Date();
      if (order.paymentMethod === 'COD') {
        order.paymentStatus = 'PAID';
      }
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: `Order status updated to ${statusUpper}`,
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update payment status (Admin)
// @route   PUT /api/orders/:id/payment-status
// @access  Private/Admin
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus, status } = req.body;

    // Accept either paymentStatus or status (for frontend compatibility)
    const newStatus = paymentStatus || status;
    const validStatuses = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'];
    const statusUpper = newStatus.toUpperCase();

    if (!validStatuses.includes(statusUpper)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status'
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    order.paymentStatus = statusUpper;
    await order.save();

    res.status(200).json({
      success: true,
      message: `Payment status updated to ${statusUpper}`,
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Process refund (Admin)
// @route   POST /api/orders/:id/refund
// @access  Private/Admin
exports.processRefund = async (req, res) => {
  try {
    const { reason } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.paymentStatus === 'REFUNDED') {
      return res.status(400).json({
        success: false,
        message: 'Order has already been refunded'
      });
    }

    // Update order status
    order.orderStatus = 'CANCELLED';
    order.paymentStatus = 'REFUNDED';
    order.refundReason = reason;
    order.refundedAt = new Date();

    // Add to status history
    order.statusHistory.push({
      status: 'CANCELLED',
      timestamp: new Date(),
      note: `Refund processed: ${reason || 'No reason provided'}`,
      updatedBy: req.user.id
    });

    // Restore inventory for each item
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: item.quantity } }
      );
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get invoice HTML
// @route   GET /api/orders/:id/invoice
// @access  Private
exports.getInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user is owner or admin
    if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this invoice'
      });
    }

    // Generate HTML invoice
    const invoiceHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice - ${order.orderNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 40px; background: #f5f5f5; }
    .invoice { max-width: 800px; margin: 0 auto; background: white; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #4a47a3; padding-bottom: 20px; }
    .company-name { font-size: 28px; font-weight: bold; color: #4a47a3; }
    .invoice-title { font-size: 24px; color: #333; }
    .invoice-number { color: #666; margin-top: 5px; }
    .addresses { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .address-block { flex: 1; }
    .address-block h4 { color: #4a47a3; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; }
    .address-block p { color: #333; line-height: 1.6; }
    .order-info { background: #f8f9fa; padding: 15px; margin-bottom: 30px; border-radius: 5px; }
    .order-info p { display: inline-block; margin-right: 30px; }
    .order-info strong { color: #4a47a3; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #4a47a3; color: white; padding: 12px; text-align: left; }
    td { padding: 12px; border-bottom: 1px solid #eee; }
    .text-right { text-align: right; }
    .totals { margin-left: auto; width: 300px; }
    .totals table { margin-bottom: 0; }
    .totals td { border: none; padding: 8px 12px; }
    .totals .total-row { font-size: 18px; font-weight: bold; background: #4a47a3; color: white; }
    .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; }
    .status-badge { display: inline-block; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold; }
    .status-placed { background: #e3f2fd; color: #1976d2; }
    .status-delivered { background: #e8f5e9; color: #388e3c; }
    .status-cancelled { background: #ffebee; color: #d32f2f; }
    @media print { body { padding: 0; background: white; } .invoice { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div>
        <div class="company-name">Barath Men's Wear</div>
        <p style="color: #666; margin-top: 5px;">Premium Men's Fashion</p>
      </div>
      <div style="text-align: right;">
        <div class="invoice-title">INVOICE</div>
        <div class="invoice-number">#${order.orderNumber}</div>
        <div style="color: #666; margin-top: 10px;">
          Date: ${new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>
    </div>

    <div class="addresses">
      <div class="address-block">
        <h4>Bill To</h4>
        <p>
          <strong>${order.shippingAddress.fullName}</strong><br>
          ${order.shippingAddress.street}<br>
          ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.pincode}<br>
          Phone: ${order.shippingAddress.phone}
        </p>
      </div>
      <div class="address-block" style="text-align: right;">
        <h4>From</h4>
        <p>
          <strong>Barath Men's Wear</strong><br>
          123 Fashion Street<br>
          Chennai, Tamil Nadu 600001<br>
          Phone: +91 98765 43210
        </p>
      </div>
    </div>

    <div class="order-info">
      <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
      <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
      <p><strong>Status:</strong> <span class="status-badge status-${order.orderStatus.toLowerCase()}">${order.orderStatus}</span></p>
    </div>

    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Size/Color</th>
          <th class="text-right">Qty</th>
          <th class="text-right">Price</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${order.items.map(item => `
          <tr>
            <td>${item.name}</td>
            <td>${item.variant?.size || '-'} / ${item.variant?.color || '-'}</td>
            <td class="text-right">${item.quantity}</td>
            <td class="text-right">₹${item.price.toFixed(2)}</td>
            <td class="text-right">₹${item.total.toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="totals">
      <table>
        <tr>
          <td>Subtotal</td>
          <td class="text-right">₹${order.subtotal.toFixed(2)}</td>
        </tr>
        ${order.discount > 0 ? `
        <tr>
          <td>Discount</td>
          <td class="text-right" style="color: #27ae60;">-₹${order.discount.toFixed(2)}</td>
        </tr>
        ` : ''}
        ${order.couponDiscount > 0 ? `
        <tr>
          <td>Coupon Discount</td>
          <td class="text-right" style="color: #27ae60;">-₹${order.couponDiscount.toFixed(2)}</td>
        </tr>
        ` : ''}
        <tr>
          <td>Shipping</td>
          <td class="text-right">${order.shippingCost > 0 ? '₹' + order.shippingCost.toFixed(2) : 'FREE'}</td>
        </tr>
        <tr class="total-row">
          <td>Total</td>
          <td class="text-right">₹${order.totalAmount.toFixed(2)}</td>
        </tr>
      </table>
    </div>

    <div class="footer">
      <p>Thank you for shopping with Barath Men's Wear!</p>
      <p style="margin-top: 10px;">For any queries, contact us at support@barathmenwear.com</p>
      <p style="margin-top: 20px; font-size: 10px;">This is a computer-generated invoice and does not require a signature.</p>
    </div>
  </div>
  <script>window.print();</script>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(invoiceHTML);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Send invoice to customer email
// @route   POST /api/orders/:id/send-invoice
// @access  Private (Owner or Admin)
exports.sendInvoiceEmail = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'firstName lastName email phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user is owner or admin
    if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to send this invoice'
      });
    }

    const customerEmail = order.user.email;

    if (!customerEmail) {
      return res.status(400).json({
        success: false,
        message: 'Customer email not found'
      });
    }

    // Generate PDF invoice
    const pdfBuffer = await generateInvoicePDF(order);

    // Use the Barath Mens Wear invoice template for email body
    const invoiceHTML = generateInvoiceHTML(order, order.user);

    // Send the invoice email with PDF attachment
    await sendEmail({
      email: customerEmail,
      subject: `Invoice for Order #${order.orderNumber} - Barath Men's Wear`,
      html: invoiceHTML,
      attachments: [
        {
          filename: 'logo.png',
          path: logoPath,
          cid: 'logo'
        },
        {
          filename: `Invoice_${order.orderNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });

    console.log(`Invoice PDF email sent to ${customerEmail} for order ${order.orderNumber}`);

    res.status(200).json({
      success: true,
      message: `Invoice PDF sent successfully to ${customerEmail}`
    });
  } catch (error) {
    console.error('Send invoice error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
