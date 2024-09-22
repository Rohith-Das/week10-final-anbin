const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    offerType: {
      type: String,
      enum: ["product", "category", "referral"],
      required: true,
    },
    offerName: {
      type: String,
      required: true,
    },
    discount: { // This is the field name expected by Mongoose
        type: Number,
        required: true,
      },
    expireDate: { // Add this field to match with the form input
      type: Date,
      required: true,
    },
    productIds: [{ 
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: function () {
        return this.offerType === "product";
      },
    }],
    categoryIds: [{ 
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: function () {
        return this.offerType === "category";
      },
    }],
    referralCode: {
      type: String,
      required: function () {
        return this.offerType === "referral";
      },
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true },
);

const Offer = mongoose.model("Offer", offerSchema);

module.exports = Offer;
