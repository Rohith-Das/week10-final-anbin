const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  price: { type: Number, required: true },
  discountedPrice: { type: Number },
  description: { type: String, required: true },
  stockQuantity: { type: Number, required: true },
  images: { type: [String], required: true },
  imageUrl: String,
  is_deleted: { type: Boolean, default: true },
  warrantyPeriod: { type: String, required: true },
  waterResistance: { type: String, required: true },
  strapDetails: {
    width: {
      type: Number,
      
    }
  },
  shape: { type: String, required: true },
  thickness: { type: Number, required: true },
  offer: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Offer' }],
}, { timestamps: true });

productSchema.index({ productName: 'text', description: 'text' });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
