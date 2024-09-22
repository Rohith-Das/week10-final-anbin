const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  order_id: {
    type: String,
    unique: true,
    required: true
  },
  address_id: {
    fullName: {
      type: String,
      required: true
    },
    addressLine1: {
      type: String,
      required: true
    },
    addressLine2: String,
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    postalCode: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true
    },
    phoneNumber: {
      type: String,
      required: true
    }
  },
  items: [{
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    productName: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    status: {
      type: String,
      enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Return Requested', 'Returned', 'Rejected'],
      default: 'Pending'
    },
    cancellation_reason: {
      type: String
    },
    price: {
      type: Number,
      required: true
    },
    discountedPrice: {
      type: Number,
      required: true
    },
    discount: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      required: true
    },
    refundAmount: { type: Number, default: 0 },
    refundStatus: { 
      type: String, 
      enum: ['Not Applicable', 'Pending', 'Processed', 'Failed'],
      default: 'Not Applicable'
    }
  }],
  subtotal: {
    type: Number,
    required: true
  },
  total_amount: {
    type: Number,
    required: true
  },
  payment_type: {
    type: String,
    required: true,
    enum: ['COD', 'PayPal', 'Credit Card', 'Bank Transfer', 'Razorpay','Wallet Cash']
  },
  payment_status: {
    type: String,
    enum: ['Pending', 'Completed', 'Failed'],
    default: 'Pending'
  },
  shipping_cost: {
    type: Number,
    default: 0
  },
  tax: {
    type: Number,
    default: 0
  },
  coupon_discount: {
    type: Number,
    default: 0
  },
  coupon_details: {
    type: Object,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  wallet_amount_used: {
    type: Number,
    default: 0
  },
  razorpay_order_id: String,
  razorpay_payment_id: String,
  razorpay_signature: String
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
