
const dotenv = require('dotenv').config();
const User = require("../model/userModel");
const Product = require("../model/productModel");
const Address = require('../model/addressModel');
const Cart=require('../model/cartModel')
const Order = require('../model/orderModel');
const { authenticate } = require('passport');
const Razorpay = require("razorpay");
const Offer= require('../model/offerModel');
const  Wishlist=require('../model/wishlistModel');
const Coupon=require('../model/couponModel');
const Wallet = require('../model/walletModel');






const loadCheckout = async (req, res) => {
    try {
      const userId = req.session.user_id;
      if (!userId) {
        return res.redirect("/login");
      }
  
      const userData = await User.findById(userId);
      const addresses = await Address.find({ user: userId });
      const cart = await Cart.findOne({ userId }).populate({
        path: 'items.productId',
        populate: { path: 'offer' }
      });
  
      if (!cart || cart.items.length === 0) {
        return res.redirect("/cart");
      }
  
      let subtotal = 0;
      let couponDiscount = 0; // Initialize coupon discount
  
      // Calculate discounted prices and totals
      cart.items.forEach(item => {
        const product = item.productId;
        let discountPercentage = 0;
        let discountedPrice = product.price; // Default to original price
  
        // Check if the product has an active offer
        if (product.offer && product.offer.length > 0) {
          const activeOffers = product.offer.filter(offer => offer.status === 'active');
          if (activeOffers.length > 0) {
            const maxDiscount = Math.max(...activeOffers.map(offer => offer.discount));
            discountPercentage = maxDiscount;
            discountedPrice = product.price - (product.price * discountPercentage / 100);
          }
        }
  
        item.discountedPrice = discountedPrice;
        item.discountPercentage = discountPercentage;
        item.totalPrice = discountedPrice * item.quantity; // Calculate total for each item
        subtotal += item.totalPrice; // Add to subtotal
      });
  
      // Calculate coupon discount if a valid coupon is applied
      if (req.body.couponCode) {
        const coupon = await Coupon.findOne({ code: req.body.couponCode, status: 'active' });
        if (coupon && subtotal >= coupon.minAmount) {
          couponDiscount = Math.min((subtotal * coupon.discount) / 100, coupon.maxDiscount);
        }
      }
  
      const totalAmount = subtotal - couponDiscount; // Calculate final amount
  
      // Fetch all active coupons
      const coupons = await Coupon.find({ status: 'active' });
  
      res.render('checkout', {
        addresses,
        cart,
        userData,
        totalAmount: totalAmount.toFixed(2),
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        coupons, 
        couponDiscount: couponDiscount.toFixed(2)
      });
    } catch (error) {
      console.error(error);
      res.status(500).send('An error occurred');
    }
  };

  // Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
  
  const createRazorpayOrder = async (req, res) => {
    try {
      const userId = req.session.user_id;
      const { couponCode } = req.body;
  
      const cart = await Cart.findOne({ userId }).populate({
        path: 'items.productId',
        populate: { path: 'offer' }
      });
  
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ success: false, message: "Cart is empty" });
      }
  
      // Calculate total amount considering discounts
      let subtotal = 0;
      cart.items.forEach(item => {
        const product = item.productId;
        let discountedPrice = product.price;
  
        // Apply product-specific discounts
        if (product.offer && product.offer.length > 0) {
          const activeOffers = product.offer.filter(offer => offer.status === 'active');
          if (activeOffers.length > 0) {
            const maxDiscount = Math.max(...activeOffers.map(offer => offer.discount));
            discountedPrice = product.price - (product.price * maxDiscount / 100);
          }
        }
  
        subtotal += discountedPrice * item.quantity;
      });
  
      // Apply coupon discount
      let couponDiscount = 0;
      let appliedCoupon = null;
  
      if (couponCode) {
        appliedCoupon = await Coupon.findOne({ code: couponCode, status: 'active' });
        if (appliedCoupon) {
          console.log('Found coupon:', appliedCoupon);
          if (new Date() <= appliedCoupon.expiryDate && subtotal >= appliedCoupon.minAmount) {
            couponDiscount = Math.min((subtotal * appliedCoupon.discount) / 100, appliedCoupon.maxDiscount || Infinity);
            console.log('Applied coupon discount:', couponDiscount);
          } else {
            console.log('Coupon not applicable. Expiry:', appliedCoupon.expiryDate, 'Min Amount:', appliedCoupon.minAmount);
          }
        } else {
          console.log('Coupon not found:', couponCode);
        }
      }
  
      // Calculate final amount
      const totalAmount = subtotal - couponDiscount;
      console.log('Subtotal:', subtotal);
      console.log('Coupon Discount:', couponDiscount);
      console.log('Total Amount:', totalAmount);
  
      const options = {
        amount: Math.round(totalAmount * 100), // Razorpay expects amount in paisa
        currency: "INR",
        receipt: `receipt_order_${new Date().getTime()}`
      };
  
      const order = await razorpay.orders.create(options);
  
      res.json({
        success: true,
        order: order,
        amount: Math.round(totalAmount * 100), // Send amount back to client in paisa
        currency: "INR",
        receipt: options.receipt,
        subtotal: subtotal,
        couponDiscount: couponDiscount,
        totalAmount: totalAmount,
        appliedCoupon: appliedCoupon ? {
          code: appliedCoupon.code,
          discount: appliedCoupon.discount
        } : null
      });
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      res.status(500).json({ success: false, message: 'Error creating Razorpay order' });
    }
  };

// payment confirmation
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    const crypto = require('crypto');
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest('hex');

    if (generated_signature === razorpay_signature) {
      // Payment is successful, proceed with order completion
      const userId = req.session.user_id;
      const cart = await Cart.findOne({ userId }).populate('items.productId');

      if (!cart) {
        return res.status(400).json({ success: false, message: "Cart not found" });
      }

      const totalAmount = cart.items.reduce((total, item) => {
        const product = item.productId;
        let discountedPrice = product.price;

        if (product.offer && product.offer.length > 0) {
          const activeOffers = product.offer.filter(offer => offer.status === 'active');
          if (activeOffers.length > 0) {
            const maxDiscount = Math.max(...activeOffers.map(offer => offer.discount));
            discountedPrice = product.price - (product.price * maxDiscount / 100);
          }
        }

        return total + discountedPrice * item.quantity;
      }, 0);

      const order = await Order.findOneAndUpdate(
        { order_id: razorpay_order_id },
        {
          user_id: userId,
          items: cart.items.map(item => ({
            product_id: item.productId._id,
            productName: item.productId.productName,
            quantity: item.quantity,
            price: item.productId.price,
            discountedPrice: item.discountedPrice,
            total: item.discountedPrice * item.quantity
          })),
          total_amount: Math.round(totalAmount * 100), // Store total amount in paisa
          payment_type: "Razorpay",
          payment_status: "Completed",
          razorpay_payment_id: razorpay_payment_id,
          razorpay_signature: razorpay_signature
        },
        { new: true, upsert: true }
      );

      // Clear the cart
      await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });

      res.json({ success: true, message: "Payment verified and order placed successfully.", orderId: order.order_id });
    } else {
      // Payment failed
      res.status(400).json({ success: false, message: "Payment verification failed." });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ success: false, message: 'Error verifying payment' });
  }
};
   
  const checkoutAddAddress = async (req, res) => {
    try {
      const userId = req.session.user_id;
      if (!userId) {
        return res.json({ success: false, message: 'User not logged in' });
      }
  
      const newAddress = new Address({
        user: userId,
        fullName: req.body.fullName,
        addressLine1: req.body.addressLine1,
        addressLine2: req.body.addressLine2,
        city: req.body.city,
        state: req.body.state,
        postalCode: req.body.postalCode,
        country: req.body.country,
        phoneNumber: req.body.phoneNumber
      });
  
      await newAddress.save();
  
      // Fetch all updated addresses after saving the new one
      const addresses = await Address.find({ user: userId });
  
      res.json({ success: true, addresses });
    } catch (error) {
      console.error(error);
      res.json({ success: false, message: 'An error occurred while adding the address' });
    }
  };
  
  const checkoutEditAddress = async (req, res) => {
    try {
      const userId = req.session.user_id;
      if (!userId) {
        return res.json({ success: false, message: 'User not logged in' });
      }
  
      const addressId = req.params.id;
      const updatedAddress = {
        fullName: req.body.fullName,
        addressLine1: req.body.addressLine1,
        addressLine2: req.body.addressLine2,
        city: req.body.city,
        state: req.body.state,
        postalCode: req.body.postalCode,
        country: req.body.country,
        phoneNumber: req.body.phoneNumber
      };
  
      await Address.findByIdAndUpdate(addressId, updatedAddress);
  
      // Fetch all updated addresses after saving the changes
      const addresses = await Address.find({ user: userId });
  
      res.json({ success: true, addresses });
    } catch (error) {
      console.error(error);
      res.json({ success: false, message: 'An error occurred while updating the address' });
    }
  };
  
  const checkoutDeleteAddress = async (req, res) => {
    try {
      const userId = req.session.user_id;
      if (!userId) {
        return res.json({ success: false, message: 'User not logged in' });
      }
  
      const addressId = req.params.id;
      await Address.findByIdAndDelete(addressId);
  
      res.json({ success: true, message: 'Address deleted successfully' });
    } catch (error) {
      console.error(error);
      res.json({ success: false, message: 'An error occurred while deleting the address' });
    }
  };
  
module.exports={
    loadCheckout,
    checkoutAddAddress,
    checkoutDeleteAddress,
    checkoutEditAddress,
    createRazorpayOrder,
    verifyPayment,

}  