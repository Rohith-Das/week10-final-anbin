// models/Coupon.js
const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true }, // Coupon code
  description: { type: String },
  discount: { type: Number, required: true }, // Percentage discount (e.g., 20 for 20%)
  minAmount: { type: Number, required: true }, // Minimum cart amount to apply coupon
  maxDiscount: { type: Number }, // Max discount amount
  expiryDate: { type: Date, required: true }, // Expiry date
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }, // Coupon status
  createdAt: { type: Date, default: Date.now },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }]
});

module.exports = mongoose.model('Coupon', couponSchema);
