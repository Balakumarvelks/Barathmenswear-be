const Payment = require('../models/Payment');
const Order = require('../models/Order');
const crypto = require('crypto');

// Initialize Stripe with lazy loading
const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return require('stripe')(process.env.STRIPE_SECRET_KEY);
};

// @desc    Test Stripe connection
// @route   GET /api/payments/stripe-status
// @access  Private
exports.getStripeStatus = async (req, res) => {
  try {
    const stripe = getStripe();
    const balance = await stripe.balance.retrieve();
    res.status(200).json({
      success: true,
      message: 'Stripe connection successful',
      currency: balance.available[0]?.currency || 'inr'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Stripe connection failed: ' + error.message
    });
  }
};

// @desc    Get payment by order
// @route   GET /api/payments/order/:orderId
// @access  Private
exports.getPaymentByOrder = async (req, res) => {
  try {
    const payment = await Payment.findOne({ order: req.params.orderId });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Verify user owns this payment
    if (payment.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this payment'
      });
    }

    res.status(200).json({
      success: true,
      payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Initialize payment (for online payment)
// @route   POST /api/payments/initialize
// @access  Private
exports.initializePayment = async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId).populate('items.product');
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized for this order'
      });
    }

    let payment = await Payment.findOne({ order: orderId });
    if (!payment) {
      payment = new Payment({
        order: orderId,
        user: req.user.id,
        amount: order.totalAmount,
        method: 'ONLINE',
        status: 'INITIATED'
      });
      await payment.save();
    }

    // Create Stripe Checkout Session
    const stripe = getStripe();

    // Build line items from order
    const lineItems = order.items.map(item => {
      const productData = {
        name: item.product?.name || item.name || 'Product',
      };

      // Only add description if variant exists with valid values
      if (item.variant && (item.variant.size || item.variant.color)) {
        const variantParts = [];
        if (item.variant.size) variantParts.push(`Size: ${item.variant.size}`);
        if (item.variant.color) variantParts.push(`Color: ${item.variant.color}`);
        productData.description = variantParts.join(', ');
      }

      return {
        price_data: {
          currency: 'inr',
          product_data: productData,
          unit_amount: Math.round(item.price * 100), // Convert to paise
        },
        quantity: item.quantity,
      };
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL}/order-confirmation/${orderId}?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/checkout?payment_cancelled=true`,
      customer_email: req.user.email,
      metadata: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        userId: req.user.id,
        paymentId: payment._id.toString()
      },
    });

    // Update payment with Stripe session details
    payment.stripeSessionId = session.id;
    await payment.save();

    res.status(200).json({
      success: true,
      payment: {
        paymentId: payment._id,
        orderId: order.orderNumber,
        amount: order.totalAmount,
        currency: 'INR',
        sessionId: session.id,
        checkoutUrl: session.url,
        stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Verify payment (after Stripe Checkout)
// @route   POST /api/payments/verify
// @access  Public
exports.verifyPayment = async (req, res) => {
  try {
    const { sessionId, orderId } = req.body;

    // Retrieve the checkout session from Stripe
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session'
      });
    }

    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Payment not successful'
      });
    }

    // Update payment
    const payment = await Payment.findOne({ order: orderId });
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    payment.stripeSessionId = sessionId;
    payment.stripePaymentIntentId = session.payment_intent;
    payment.status = 'SUCCESS';
    payment.paidAt = Date.now();
    await payment.save();

    // Update order
    const order = await Order.findByIdAndUpdate(
      orderId,
      { paymentStatus: 'PAID' },
      { new: true }
    );

    // Send invoice email after successful payment
    try {
      const User = require('../models/User');
      const sendEmail = require('../utils/sendEmail');
      const generateInvoiceHTML = require('../utils/invoiceTemplate');
      const generateInvoicePDF = require('../utils/generateInvoicePDF');
      const path = require('path');
      const logoPath = path.join(__dirname, '../uploads/products/logo.png');

      const user = await User.findById(order.user);
      if (user && user.email) {
        const pdBuffer = await generateInvoicePDF(order);
        const invHTML = generateInvoiceHTML(order, user);

        await sendEmail({
          email: user.email,
          subject: `Payment Successful! Invoice for Order #${order.orderNumber} - Barath Mens Wear`,
          html: invHTML,
          attachments: [
            {
              filename: `Invoice_${order.orderNumber}.pdf`,
              content: pdBuffer,
              contentType: 'application/pdf'
            }
          ]
        });
        console.log(`Payment success email sent to ${user.email}`);
      }
    } catch (emailError) {
      console.error('Failed to send payment success email:', emailError);
    }

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
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

// @desc    Process refund
// @route   POST /api/payments/:paymentId/refund
// @access  Private/Admin
exports.processRefund = async (req, res) => {
  try {
    const { amount, reason } = req.body;

    const payment = await Payment.findById(req.params.paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.status !== 'SUCCESS') {
      return res.status(400).json({
        success: false,
        message: 'Cannot refund non-successful payment'
      });
    }

    // Process refund through Stripe
    const refundAmount = amount || payment.amount;

    let refund;
    if (payment.stripePaymentIntentId) {
      const stripe = getStripe();
      refund = await stripe.refunds.create({
        payment_intent: payment.stripePaymentIntentId,
        amount: Math.round(refundAmount * 100), // Convert to cents
        reason: reason || 'requested_by_customer'
      });
    }

    payment.refundId = refund ? refund.id : `REF${Date.now()}`;
    payment.refundAmount = refundAmount;
    payment.refundStatus = 'PROCESSED';
    payment.refundedAt = Date.now();
    payment.status = 'REFUNDED';
    await payment.save();

    // Update order refund status
    const order = await Order.findByIdAndUpdate(
      payment.order,
      { refundStatus: 'COMPLETED', refundAmount: refundAmount },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      refundId: payment.refundId,
      payment,
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get payment history
// @route   GET /api/payments/history
// @access  Private
exports.getPaymentHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const filter = { user: req.user.id };
    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;

    const payments = await Payment.find(filter)
      .populate('order', 'orderNumber totalAmount')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Payment.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: payments.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      payments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
