const Product = require("../model/productModel");
const User = require("../model/userModel");
const Cart=require('../model/cartModel')
const addToCart = async (req, res) => {
    try {
      const userId = req.session.user_id;
      const productId = req.params.id;
  
      if (!userId) {
        return res.json({ success: false, redirectTo: '/login' });
      }
  
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
  
      if (product.stockQuantity === 0) {
        return res.json({ success: false, message: 'Product is out of stock' });
      }
  
      let cart = await Cart.findOne({ userId });
      if (!cart) {
        cart = new Cart({ userId, items: [] });
      }
  
      let existingItem = cart.items.find(item => item.productId.toString() === productId);
  
      if (existingItem) {
        if (existingItem.quantity >= 5) {
          return res.json({ success: false, message: 'You cannot add more than 5 of this item to the cart.' });
        }
        existingItem.quantity += 1;
      } else {
        cart.items.push({ productId, quantity: 1 });
      }
  
      await cart.save();
  
      res.json({ success: true });
    } catch (error) {
      console.error('Error adding to cart:', error);
      res.status(500).json({ success: false, message: 'Error adding to cart' });
    }
  };
  
  const getCart = async (req, res) => {
    try {
      const userId = req.session.user_id;
      const user = req.session.user || req.user;
      const id = req.query.id;
  
      if (!userId) {
        return res.redirect('/login');
      }
  
      const cart = await Cart.findOne({ userId }).populate({
        path: 'items.productId',
        populate: { path: 'offer' }
      });
  
      if (!cart) {
        return res.render('cart', { cart: null, userData: null, message: 'Cart is empty' });
      }
  
      // Filter out unlisted products (is_deleted: true)
      cart.items = cart.items.filter(item => !item.productId.is_deleted);
  
      // Calculate discounted prices for each item in the cart
      cart.items.forEach(item => {
        const product = item.productId;
        let discountPercentage = 0;
        let discountedPrice = product.price;
  
        if (product.offer && product.offer.length > 0) {
          const highestDiscountOffer = product.offer
            .filter(offer => offer.status === 'active')
            .reduce((max, offer) => offer.discount > max ? offer.discount : max, 0);
  
          if (highestDiscountOffer > 0) {
            discountPercentage = highestDiscountOffer;
            discountedPrice = Math.round(product.price * (1 - discountPercentage / 100));
          }
        }
  
        item.discountedPrice = discountedPrice;
      });
  
      // Render the cart view, passing the filtered cart items
      res.render('cart', { cart, userData: user, message: cart.items.length ? null : 'Cart is empty' });
    } catch (error) {
      console.error('Error fetching cart:', error);
      res.status(500).send('Error fetching cart');
    }
  };
  
  
  
  
  const updateCart = async (req, res) => {
    try {
      const { productId, quantity } = req.body;
      const userId = req.session.user_id;
  
      const cart = await Cart.findOne({ userId }).populate({
        path: 'items.productId',
        populate: { path: 'offer' }
      });
  
      if (!cart) {
        return res.status(404).json({ success: false, error: 'Cart not found' });
      }
  
      const item = cart.items.find(item => item.productId._id.toString() === productId);
      if (!item) {
        return res.status(404).json({ success: false, error: 'Item not found in cart' });
      }
  
      const product = item.productId;
      if (quantity > product.stockQuantity) {
        return res.status(400).json({ success: false, error: 'Quantity exceeds available stock', stockQuantity: product.stockQuantity });
      }
  
      item.quantity = quantity;
  
      // Calculate discounted price
      if (product.offer && product.offer.status === 'active') {
        item.discountedPrice = Math.round(product.price * (1 - product.offer.discount / 100));
      } else {
        item.discountedPrice = product.price;
      }
  
      await cart.save();
  
      const updatedItemTotal = item.quantity * item.discountedPrice;
      const updatedCartTotal = cart.items.reduce((total, cartItem) => 
        total + cartItem.quantity * (cartItem.discountedPrice || cartItem.productId.price), 0);
  
      res.json({
        success: true,
        updatedItemTotal,
        updatedCartTotal
      });
    } catch (error) {
      console.error('Error updating cart:', error);
      res.status(500).json({ success: false, error: 'Error updating cart' });
    }
  };
  
  
  const removeFromCart = async (req, res) => {
    try {
      const { productId } = req.body;
      const userId = req.session.user_id;
  
      const cart = await Cart.findOne({ userId });
  
      if (!cart) {
        return res.status(404).json({ success: false, error: 'Cart not found' });
      }
  
      const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
      if (itemIndex === -1) {
        return res.status(404).json({ success: false, error: 'Item not found in cart' });
      }
  
      cart.items.splice(itemIndex, 1);
      await cart.save();
  
      // Recalculate cart total with discounted prices
      await cart.populate({
        path: 'items.productId',
        populate: { path: 'offer' }
      });
  
      cart.items.forEach(item => {
        const product = item.productId;
        if (product.offer && product.offer.status === 'active') {
          item.discountedPrice = Math.round(product.price * (1 - product.offer.discount / 100));
        } else {
          item.discountedPrice = product.price;
        }
      });
  
      const updatedCartTotal = cart.items.reduce((total, item) => 
        total + item.quantity * (item.discountedPrice || item.productId.price), 0);
  
      res.json({ success: true, updatedCartTotal });
    } catch (error) {
      console.error('Error removing from cart:', error);
      res.status(500).json({ success: false, error: 'Error removing from cart' });
    }
  };

  module.exports={
    addToCart,
    getCart,
    updateCart,
    removeFromCart,
    
  }