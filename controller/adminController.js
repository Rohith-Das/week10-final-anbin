const User = require('../model/userModel');
const Category = require('../model/categoryModel');
const Brand = require('../model/brandModel');
const Product = require('../model/productModel');
const bcrypt = require('bcrypt');
const { query } = require('express');
const multer = require('../middleware/multer');
const Order = require('../model/orderModel');
const Offer= require('../model/offerModel');
const Coupon=require('../model/couponModel');
const moment = require('moment');
const PDFDocument = require('pdfkit');
const excel = require('excel4node');



const adminLogin = async (req, res) => {
    try {
        res.render('adminLogin');
    } catch (error) {
        res.send(error.message);
    }
}

const adminDash = async (req, res) => {
    try {
        const { filter, startDate, endDate, page = 1, limit = 10 } = req.query;
        const pageNumber = parseInt(page);
        const limitNumber = parseInt(limit);
        let dateFilter = {};
        if (filter === 'daily') {
            dateFilter = { 
                createdAt: { 
                    $gte: moment().startOf('day').toDate(), 
                    $lte: moment().endOf('day').toDate() 
                }
            };
        } else if (filter === 'weekly') {
            dateFilter = { 
                createdAt: { 
                    $gte: moment().startOf('week').toDate(), 
                    $lte: moment().endOf('week').toDate() 
                }
            };
        } else if (filter === 'monthly') {
            dateFilter = { 
                createdAt: { 
                    $gte: moment().startOf('month').toDate(), 
                    $lte: moment().endOf('month').toDate() 
                }
            };
        } else if (filter === 'yearly') {
            dateFilter = { 
                createdAt: { 
                    $gte: moment().startOf('year').toDate(), 
                    $lte: moment().endOf('year').toDate() 
                }
            };
        } else if (filter === 'custom' && startDate && endDate) {
            dateFilter = { 
                createdAt: { 
                    $gte: moment(startDate).startOf('day').toDate(), 
                    $lte: moment(endDate).endOf('day').toDate() 
                }
            };
        } else if (filter === 'date-range' && startDate && endDate) {
            dateFilter = { 
                createdAt: { 
                    $gte: moment(startDate).startOf('day').toDate(), 
                    $lte: moment(endDate).endOf('day').toDate() 
                }
            };
        }
        const aggregateResult = await Order.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: null,
                    overallOrderAmount: { $sum: '$total_amount' },
                    overallDiscount: { $sum: { $ifNull: ['$coupon_discount', 0] } },
                    overallSalesCount: { $sum: 1 }
                }
            }
        ]);

        const { overallOrderAmount = 0, overallDiscount = 0, overallSalesCount = 0 } = 
            aggregateResult[0] || {};

        const totalOrders = await Order.countDocuments(dateFilter);
        const orders = await Order.find(dateFilter)
        .populate('user_id')
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber)
        .sort({ createdAt: -1 });
        const orderDetails = orders.map(order => ({
            orderDate: moment(order.createdAt).format('YYYY-MM-DD'),
            orderId: order.order_id,
            customerName: order.user_id?.name || 'Unknown',

            paymentMethod: order.payment_type,
            couponCode: order.coupon_details ? order.coupon_details.code : 'N/A',
            orderStatus: order.payment_status,
            discount: order.coupon_discount || 0,
            itemQuantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
            totalAmount: order.total_amount
        }));

        const totalPages = Math.ceil(totalOrders / limitNumber);
        const hasNextPage = pageNumber < totalPages;
        const hasPrevPage = pageNumber > 1;
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({
                overallSalesCount,
                overallOrderAmount,
                overallDiscount,
                orders: orderDetails,
                pagination: {
                    currentPage: pageNumber,
                    totalPages,
                    hasNextPage,
                    hasPrevPage,
                    totalOrders: overallSalesCount
                }
            });
        }
        res.render('adminDashboard', {
            filter,
            startDate: startDate || '',
            endDate: endDate || '',
            overallSalesCount,
            overallOrderAmount,
            overallDiscount,
            orders: orderDetails,
            pagination: {
                currentPage: pageNumber,
                totalPages,
                hasNextPage,
                hasPrevPage,
                totalOrders: overallSalesCount
            }
        });
    } catch (error) {
        console.error('Error fetching sales data:', error);
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(500).json({ error: 'Error fetching sales data' });
        }
        res.status(500).send('Error loading dashboard');
    }
};

const verifyAdmin = async (req, res) => {
    try {
        const email = req.body.email;
        const password = req.body.password;
        const userData = await User.findOne({ email: email });

        if (userData) {
            if (userData.is_blocked) {
                return res.render('adminLogin', { message: "Your account is blocked. Please contact support." });
            }
            const passwordMatch = await bcrypt.compare(password, userData.password);

            if (passwordMatch) {
                if (userData.is_admin === 1) {
                    req.session.admin_id = userData._id; 
                    res.redirect("/admin/dashboard");
                } else {
                    res.render('adminLogin', { message: "Email and password are incorrect" });
                }
            } else {
                res.render('adminLogin', { message: "Email and password are incorrect" });
            }
        } else {
            res.render('adminLogin', { message: "Email and password are incorrect" });
        }
    } catch (error) {
        res.send(error.message);
    }
};



const allCustomers = async (req, res) => {
    try {
        const search = req.query.search || '';
        const page = parseInt(req.query.page) || 1;
        const limit = 10; 
        const skip = (page - 1) * limit;

        const query = {
            is_admin: 0,
            $or: [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ]
        };
        const totalUsers = await User.countDocuments(search ? query : { is_admin: 0 });
        const totalPages = Math.ceil(totalUsers / limit);

        const users = await User.find(search ? query : { is_admin: 0 })
            .skip(skip)
            .limit(limit);

        res.render('customer3', { 
            users, 
            search, 
            currentPage: page, 
            totalPages,
            totalUsers
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
};

// Block User
const blockUser = async (req, res) => {
    try {
        const userId = req.params.userId;
        await User.findByIdAndUpdate(userId, { is_blocked: true });
        res.redirect('/admin/dashboard/allcustomer');
    } catch (error) {
        res.send(error.message);
    }
};

// Unblock User
const unblockUser = async (req, res) => {
    try {
        const userId = req.params.userId;
        await User.findByIdAndUpdate(userId, { is_blocked: false });
        res.redirect('/admin/dashboard/allcustomer');
    } catch (error) {
        res.send(error.message);
    }
};





const loadBrand = async (req, res) => {
    try {
        const search = req.query.search || ''; 
        const page = parseInt(req.query.page) || 1;
        const limit = 5; 
        const skip = (page - 1) * limit; 
      
        const query = search 
            ? { name: { $regex: search, $options: 'i' } } 
            : {};

        const totalBrands = await Brand.countDocuments(query);
        const brands = await Brand.find(query)
            .skip(skip)
            .limit(limit);
        const totalPages = Math.ceil(totalBrands / limit);
        res.render('brands', {
            brands,
            currentPage: page,
            totalPages,
            totalBrands,
            search
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
};


const addBrand = async (req, res) => {
    try {
        const { brandName, description, status } = req.body;
        const existingBrand = await Brand.findOne({ brandName });

        if (existingBrand) {
            const brands = await Brand.find();
            return res.render('brands', { 
                brands, 
                message: 'Brand already exists' 
            });
        }
        const newBrand = new Brand({ brandName, description, is_deleted: status === 'unlisted' });
        await newBrand.save();
        res.redirect('/admin/dashboard/brandList');
    } catch (error) {
        res.status(500).send(error.message);
    }
};
const editBrand = async (req, res) => {
    try {
        const { id, brandName, description, status } = req.body;

        // Check for duplicate brand name
        const existingBrand = await Brand.findOne({ brandName, _id: { $ne: id } });

        if (existingBrand) {
            const brands = await Brand.find();
            return res.render('brands', { 
                brands, 
                message: 'Brand name already exists' 
            });
        }

        const updatedBrand = await Brand.findByIdAndUpdate(id, { brandName, description, is_deleted: status === 'unlisted' }, { new: true });

        if (updatedBrand) {
            res.redirect('/admin/dashboard/brandList');
        } else {
            res.redirect('/admin/dashboard/brandList', { message: 'Brand not found' });
        }
    } catch (error) {
        res.status(500).send(error.message);
    }
};


const toggleBrandStatus = async (req, res) => {
    try {
        const { brandId } = req.params;
        const brand = await Brand.findById(brandId);

        if (brand) {
            brand.is_deleted = !brand.is_deleted;
            await brand.save();

            res.json({ success: true, message: 'Brand status updated successfully' });
        } else {
            res.status(404).json({ success: false, message: 'Brand not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Function to get active categories
const getActiveCategories = async () => {
    return await Category.find({ is_delete: false, status: 'active' });
};

// Function to get active brands
const getActiveBrands = async () => {
    return await Brand.find({ is_deleted: false });
};



  const loadOrderList = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;

        const totalOrders = await Order.countDocuments({
            $or: [
                { order_id: { $regex: search, $options: 'i' } },
                { 'user_id.name': { $regex: search, $options: 'i' } },
                { payment_status: { $regex: search, $options: 'i' } }
            ]
        });

        const totalPages = Math.ceil(totalOrders / limit);
        const currentPage = Math.max(1, Math.min(page, totalPages)); 

        const orders = await Order.find({
            $or: [
                { order_id: { $regex: search, $options: 'i' } },
                { 'user_id.name': { $regex: search, $options: 'i' } },
                { payment_status: { $regex: search, $options: 'i' } }
            ]
        })
        .populate('user_id')
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * limit)
        .limit(limit);

        res.render('adminOrderList', { orders, currentPage, totalPages, search });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).send('Error fetching orders');
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, itemId, status } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const item = order.items.id(itemId);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Order item not found' });
        }
        const statusTransitions = {
            'Pending': ['Processing'],
            'Processing': ['Shipped'],
            'Shipped': ['Delivered'],
            'Delivered': ['Cancelled', 'Returned'],
            'Cancelled': [],
            'Return Requested': ['Returned', 'Rejected'],
            'Returned': [],
            'Rejected': []
        };
        if (!statusTransitions[item.status].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status change' });
        }

        item.status = status;
        await order.save();

        res.json({ success: true, message: 'Order status updated successfully' });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ success: false, message: 'Failed to update order status' });
    }
};



// offers

const listOffers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; 
        const limit = parseInt(req.query.limit) || 10; 
        const skip = (page - 1) * limit;
        const offers = await Offer.find()
            .populate('productIds', 'productName')
            .populate('categoryIds', 'categoryName')
            .skip(skip)
            .limit(limit)
            .exec();

        const products = await Product.find({ is_deleted: false }).select('productName');
        const categories = await Category.find({ is_delete: false }).select('categoryName');
        const totalOffer=await Offer.countDocuments();

        res.render('offerList', { offers, products, categories,currentPage:page,totalPages:Math.ceil(totalOffer/limit) });
    } catch (error) {
        console.error("Error fetching offers:", error);
        res.status(500).send("Error fetching offers: " + error.message);
    }
};


const createOfferForm = async (req, res) => {
    try {
        const products = await Product.find({ is_deleted: false }).select('productName');
        const categories = await Category.find({ is_delete: false }).select('categoryName');
        res.render('offer', { products, categories });
    } catch (error) {
        res.status(500).send("Error fetching products and categories");
    }
};
const createOffer = async (req, res) => {
    try {
        const { offerName, discount, expireDate, offerType, references } = req.body;
        console.log('Received offer data:', { offerName, discount, expireDate, offerType, references });
        if (!Array.isArray(references) || references.length === 0) {
            throw new Error('No products or categories selected');
        }
        const newOffer = new Offer({
            offerName,
            discount,
            expireDate,
            offerType,
            productIds: offerType === 'product' ? references : [],
            categoryIds: offerType === 'category' ? references : [],
        });
        await newOffer.save();
        console.log('New offer created:', newOffer);
        const calculateDiscountedPrice = (price, discount) => {
            return Math.round(price * (1 - discount / 100));
        };
        let productsToUpdate = [];
        if (offerType === 'product') {
            productsToUpdate = await Product.find({ _id: { $in: references } });
        } else if (offerType === 'category') {
            productsToUpdate = await Product.find({ category: { $in: references } });
        }

        console.log(`Found ${productsToUpdate.length} products to update`);
        const updatePromises = productsToUpdate.map(async (product) => {
            console.log(`Updating product: ${product._id}`);
            product.offer = newOffer._id;
            product.discountedPrice = calculateDiscountedPrice(product.price, newOffer.discount);
            return product.save();
        });

        const updatedProducts = await Promise.all(updatePromises);
        console.log(`Updated ${updatedProducts.length} products`);

        res.redirect('/admin/dashboard/offers');
    } catch (error) {
        console.error("Error creating offer:", error);
        res.status(500).send("Error creating offer: " + error.message);
    }
};
const toggleOfferStatus = async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id);
        if (!offer) {
            return res.status(404).json({ success: false, message: "Offer not found" });
        }

        const newStatus = req.body.newStatus;
        if (newStatus !== 'active' && newStatus !== 'inactive') {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }

        offer.status = newStatus;
        await offer.save();

        let productsToUpdate = [];
        if (offer.offerType === "product") {
            productsToUpdate = await Product.find({ _id: { $in: offer.productIds } });
        } else if (offer.offerType === "category") {
            productsToUpdate = await Product.find({ category: { $in: offer.categoryIds } });
        }

        const calculateDiscountedPrice = (price, discount) => {
            return Math.round(price * (1 - discount / 100));
        };

        for (const product of productsToUpdate) {
            if (newStatus === "inactive") {
                if (product.offer && product.offer.toString() === offer._id.toString()) {
                    product.offer = null;
                    product.discountedPrice = product.price;
                }
            } else {
                if (!product.offer || (product.offer && offer.discount > product.offer.discount)) {
                    product.offer = offer._id;
                    product.discountedPrice = calculateDiscountedPrice(product.price, offer.discount);
                }
            }
            await product.save();
        }

        res.json({ success: true, message: `Offer status updated to ${newStatus}` });
    } catch (error) {
        console.error("Error toggling offer status:", error);
        res.status(500).json({ success: false, message: "Error toggling offer status: " + error.message });
    }
};

const getOfferDetails = async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id)
            .populate('productIds', 'productName')
            .populate('categoryIds', 'categoryName');
        res.json(offer);
    } catch (error) {
        console.error("Error fetching offer details:", error);
        res.status(500).json({ error: "Error fetching offer details" });
    }
};

const editOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const { offerName, discount, expireDate, offerType, references } = req.body;

        const parsedDiscount = parseFloat(discount);
        if (isNaN(parsedDiscount) || parsedDiscount < 0 || parsedDiscount > 100) {
            return res.status(400).json({ success: false, message: "Invalid discount value" });
        }

        const updatedOffer = await Offer.findByIdAndUpdate(
            id,
            {
                offerName,
                discount: parsedDiscount,
                expireDate,
                offerType,
                productIds: offerType === 'product' ? references : [],
                categoryIds: offerType === 'category' ? references : [],
            },
            { new: true, runValidators: true }
        );
        const currentDate = new Date();
        if (new Date(expireDate) < currentDate) {
            return res.status(400).json({ success: false, message: "Expire date must be in the future" });
        }
        
        if (!updatedOffer) {
            return res.status(404).json({ success: false, message: "Offer not found" });
        }

        const calculateDiscountedPrice = (price, discount) => {
            return Math.round(price * (1 - discount / 100));
        };

        let productsToUpdate = [];
        if (offerType === 'product') {
            productsToUpdate = await Product.find({ _id: { $in: references } });
        } else if (offerType === 'category') {
            productsToUpdate = await Product.find({ category: { $in: references } });
        }
        for (const product of productsToUpdate) {
            product.offer = updatedOffer._id;
            product.discountedPrice = calculateDiscountedPrice(product.price, updatedOffer.discount);
            await product.save();
        }

        res.json({ success: true, message: "Offer updated successfully and applied to products" });
    } catch (error) {
        console.error("Error updating offer:", error);
        res.status(500).json({ success: false, message: "Error updating offer: " + error.message });
    }
};
const deleteOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const offer = await Offer.findByIdAndDelete(id);

        if (!offer) {
            return res.status(404).json({ success: false, message: "Offer not found" });
        }
        let productsToUpdate = [];
        if (offer.offerType === 'product') {
            productsToUpdate = await Product.find({ _id: { $in: offer.productIds } });
        } else if (offer.offerType === 'category') {
            productsToUpdate = await Product.find({ category: { $in: offer.categoryIds } });
        }

        for (const product of productsToUpdate) {
            if (product.offer && product.offer.toString() === offer._id.toString()) {
                product.offer = null;
                product.discountedPrice = product.price; 
                await product.save();
            }
        }

        res.redirect('/admin/dashboard/offers');
    } catch (error) {
        console.error("Error deleting offer:", error);
        res.status(500).send("Error deleting offer: " + error.message);
    }
};

// coupon management
const listCoupons = async (req, res) => {
    try {
      const page = parseInt(req.query.page || 1);
      const limit = 10;
      const skip = (page - 1) * limit;
      
      const totalCoupons = await Coupon.countDocuments();
      const totalPages = Math.ceil(totalCoupons / limit);
      const coupons = await Coupon.find().skip(skip).limit(limit).sort({createdAt: -1});
      
      res.render('couponList', { 
        coupons,
        currentPage: page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        totalCoupons 
      });
    } catch (error) {
      console.error('Error fetching coupons:', error);
      res.status(500).send('Error fetching coupons');
    }
  };
  const showCreateCouponForm = async (req, res) => {
    try {
      res.render('coupon');
    } catch (error) {
      console.error('Error rendering create coupon form:', error);
      res.status(500).send('Error displaying the create coupon form');
    }
  };
  
  // Create Coupon
  const createCoupon = async (req, res) => {
    try {
      const { code, description, discount, minAmount, maxDiscount, expiryDate } = req.body;
      const newCoupon = new Coupon({
        code,
        description,
        discount,
        minAmount,
        maxDiscount,
        expiryDate
      });
      await newCoupon.save();
      res.render('couponList', { successMessage: 'Coupon created successfully!', coupons: await Coupon.find() });
    } catch (error) {
      console.error('Error creating coupon:', error);
      res.render('coupon', { errorMessage: 'Error creating coupon. Please try again.' });
    }
  };
  
  // Get Coupon by ID (for Edit Modal)
  const getCouponById = async (req, res) => {
    try {
      const coupon = await Coupon.findById(req.params.id);
      if (!coupon) {
        return res.status(404).json({ message: 'Coupon not found' });
      }
      res.json(coupon);
    } catch (error) {
      console.error('Error fetching coupon:', error);
      res.status(500).json({ message: 'Error fetching coupon' });
    }
  };
  
 // Update Coupon
const updateCoupon = async (req, res) => {
    try {
      const { id, code, description, discount, minAmount, maxDiscount, expiryDate } = req.body;
      await Coupon.findByIdAndUpdate(id, {
        code,
        description,
        discount,
        minAmount,
        maxDiscount,
        expiryDate
      });
  
      const page = 1; 
      const limit = 10;
      const totalCoupons = await Coupon.countDocuments();
      const totalPages = Math.ceil(totalCoupons / limit);
      const coupons = await Coupon.find().limit(limit).sort({createdAt: -1});
      res.render('couponList', { 
        successMessage: 'Coupon updated successfully!', 
        coupons,
        currentPage: page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        totalCoupons 
      });
    } catch (error) {
      console.error('Error updating coupon:', error);
      const page = 1;
      const limit = 10;
      const totalCoupons = await Coupon.countDocuments();
      const totalPages = Math.ceil(totalCoupons / limit);
      const coupons = await Coupon.find().limit(limit).sort({createdAt: -1});
  
      res.render('couponList', { 
        errorMessage: 'Error updating coupon. Please try again.', 
        coupons,
        currentPage: page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        totalCoupons 
      });
    }
  };
 // Toggle Coupon Status (List/Unlist)
const toggleCouponStatus = async (req, res) => {
    try {
      const coupon = await Coupon.findById(req.params.id);
      if (!coupon) {
        return res.status(404).send('Coupon not found');
      }
      coupon.status = coupon.status === 'active' ? 'inactive' : 'active';
      await coupon.save();
  
      const page=req.query.page ||1;
      res.redirect(`/admin/dashboard/coupons?page=${page}`);  
    } catch (error) {
      console.error('Error toggling coupon status:', error);
      const coupons = await Coupon.find();
      res.render('couponList', { errorMessage: 'Error toggling coupon status. Please try again.', coupons });
    }
  };
  
  

// Sales report start here
const getSalesReport = async (req, res) => {
    try {
        const { filter, startDate, endDate, page = 1, limit = 10 } = req.query;
        let dateFilter = {};
        if (filter === 'daily') {
            dateFilter = { $gte: moment().startOf('day').toDate(), $lte: moment().endOf('day').toDate() };
        } else if (filter === 'weekly') {
            dateFilter = { $gte: moment().startOf('isoWeek').toDate(), $lte: moment().endOf('isoWeek').toDate() };
        } else if (filter === 'monthly') {
            dateFilter = { $gte: moment().startOf('month').toDate(), $lte: moment().endOf('month').toDate() };
        } else if (filter === 'yearly') {
            dateFilter = { $gte: moment().startOf('year').toDate(), $lte: moment().endOf('year').toDate() };
        } else if (filter === 'custom' && startDate && endDate) {
            dateFilter = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }
        const totalOrders = await Order.countDocuments({ created_at: { $gte: dateFilter.$gte, $lte: dateFilter.$lte } });
        const aggregateResult = await Order.aggregate([
            { $match: { created_at: { $gte: dateFilter.$gte, $lte: dateFilter.$lte } } },
            { $group: {
                _id: null,
                totalSales: { $sum: '$total_amount' },
                totalDiscount: { $sum: { $ifNull: ['$coupon_discount', 0] } }
            }}
        ]);

        const overallOrderAmount = aggregateResult.length > 0 ? aggregateResult[0].totalSales : 0;
        const overallDiscount = aggregateResult.length > 0 ? aggregateResult[0].totalDiscount : 0;
        const orders = await Order.find({ created_at: { $gte: dateFilter.$gte, $lte: dateFilter.$lte } })
            .populate('user_id')
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const orderDetails = orders.map(order => ({
            orderDate: moment(order.created_at).format('YYYY-MM-DD'),
            orderId: order.order_id,
            customerName: order.user_id ? order.user_id.name : 'No Name',
            paymentMethod: order.payment_type,
            couponCode: order.coupon_details ? order.coupon_details.code : 'N/A',
            orderStatus: order.payment_status,
            discount: order.coupon_discount || 0,
            itemQuantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
            totalAmount: order.total_amount
        }));

        const totalPages = Math.ceil(totalOrders / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;
        res.json({
            overallSalesCount: totalOrders,
            overallOrderAmount,
            overallDiscount,
            orders: orderDetails,
            pagination: {
                currentPage: Number(page),
                totalPages,
                totalOrders,
                hasNextPage,
                hasPrevPage
            }
        });
    } catch (error) {
        console.error('Error generating sales report:', error);
        res.status(500).json({ message: 'Failed to generate sales report.' });
    }
};

  
  
  
//   sale report download////////////////////////////////////////////////////////
const downloadSalesReport = async (req, res) => {
    try {
        const { filter, startDate, endDate, format } = req.query;
        let dateFilter = {};
        if (filter === 'daily') {
            dateFilter = { $gte: moment().startOf('day').toDate(), $lte: moment().endOf('day').toDate() };
        } else if (filter === 'weekly') {
            dateFilter = { $gte: moment().startOf('isoWeek').toDate(), $lte: moment().endOf('isoWeek').toDate() };
        } else if (filter === 'monthly') {
            dateFilter = { $gte: moment().startOf('month').toDate(), $lte: moment().endOf('month').toDate() };
        } else if (filter === 'yearly') {
            dateFilter = { $gte: moment().startOf('year').toDate(), $lte: moment().endOf('year').toDate() };
        } else if (filter === 'custom' && startDate && endDate) {
            dateFilter = { $gte: new Date(startDate), $lte: new Date(endDate) };
        } else {
            throw new Error('Invalid date filter');
        }
        const orders = await Order.find({ createdAt: dateFilter }).populate('user_id');

        if (orders.length === 0) {
            return res.status(404).json({ message: 'No orders found for the specified date range.' });
        }

        if (format === 'pdf') {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');
            
            doc.pipe(res);
            doc.fontSize(18).text('Sales Report', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text(`Date Range: ${moment(dateFilter.$gte).format('YYYY-MM-DD')} to ${moment(dateFilter.$lte).format('YYYY-MM-DD')}`);
            doc.moveDown();
            const tableTop = 150;
            const tableLeft = 50;
            const columnWidth = 100;
            
            ['Date', 'Order ID', 'Customer', 'Total Amount'].forEach((header, i) => {
                doc.text(header, tableLeft + i * columnWidth, tableTop);
            });
            doc.moveDown();
            let yPosition = tableTop + 20;
            orders.forEach((order, index) => {
                doc.fontSize(10);
                doc.text(moment(order.createdAt).format('YYYY-MM-DD'), tableLeft, yPosition);
                doc.text(order.order_id, tableLeft + columnWidth, yPosition);
                const customerName = order.user_id && order.user_id.fullName ? order.user_id.fullName : 'Guest User';
                doc.text(customerName, tableLeft + columnWidth * 2, yPosition);
                doc.text(`$${order.total_amount.toFixed(2)}`, tableLeft + columnWidth * 3, yPosition);
                yPosition += 20;

                if (yPosition > 700) { 
                    doc.addPage();
                    yPosition = 50;
                }
            });
            doc.addPage();
            doc.fontSize(14).text('Summary', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text(`Total Orders: ${orders.length}`);
            doc.text(`Total Sales: $${orders.reduce((sum, order) => sum + order.total_amount, 0).toFixed(2)}`);
            doc.text(`Total Discount: $${orders.reduce((sum, order) => sum + (order.coupon_discount || 0), 0).toFixed(2)}`);
            doc.end();
        } else if (format === 'excel') {
            const workbook = new excel.Workbook();
            const worksheet = workbook.addWorksheet('Sales Report');
            const headerStyle = workbook.createStyle({
                font: { bold: true, color: '#FFFFFF' },
                fill: { type: 'pattern', patternType: 'solid', fgColor: '#4472C4' }
            });
            ['Date', 'Order ID', 'Customer', 'Total Amount'].forEach((header, index) => {
                worksheet.cell(1, index + 1).string(header).style(headerStyle);
            });
            orders.forEach((order, index) => {
                const row = index + 2;
                worksheet.cell(row, 1).string(moment(order.createdAt).format('YYYY-MM-DD'));
                worksheet.cell(row, 2).string(order.order_id);
                const customerName = order.user_id && order.user_id.fullName ? order.user_id.fullName : 'Guest User';
                worksheet.cell(row, 3).string(customerName);
                worksheet.cell(row, 4).number(order.total_amount);
            });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=sales_report.xlsx');

            workbook.write('sales_report.xlsx', res);
        } else {
            throw new Error('Invalid format specified');
        }
    } catch (error) {
        console.error('Error in downloadSalesReport:', error);
        res.status(500).json({ 
            message: 'Failed to generate sales report', 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};
module.exports = {
    adminLogin,
    adminDash,
    
    verifyAdmin,
    allCustomers,
  
    blockUser,
    unblockUser,
   
  
    loadBrand,
    editBrand,
    addBrand,
    toggleBrandStatus,
    loadOrderList,
    updateOrderStatus,
    createOffer,
    createOfferForm ,
    listOffers,
    toggleOfferStatus,
    getOfferDetails,
    editOffer,
    deleteOffer,
    listCoupons,
    createCoupon,
    showCreateCouponForm,
    getCouponById,
    updateCoupon,
    
    toggleCouponStatus,
    getSalesReport,
    downloadSalesReport 
  
 
   
   
   

   
    
};
