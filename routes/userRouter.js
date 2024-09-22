const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const passport=require("passport")
reqPassport=require("../config/passport");
const UserController = require('../controller/userController');
const cartController=require('../controller/cartController')
const checkoutController=require('../controller/checkoutController');
const auth=require('../middleware/userAuth')


router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));
router.use(passport.initialize());
router.use(passport.session());

// In userRouter.js
router.get('/', UserController.loadHome);
router.get('/home', UserController.loadHome);
router.get('/search', UserController.loadHome);


router.get('/login', UserController.loadLogin);
router.post('/login', UserController.authenticateUser);
router.get('/register', UserController.loadRegister);
router.post("/register", UserController.insertUser);
router.get("/verify-otp", UserController.loadVerifyOtp);
router.post("/verify-otp", UserController.verifyOTP);
router.get("/resend-otp", UserController.resentOTP);
router.get("/logout",UserController.logoutUser);
router.post("/logout",UserController.logoutUser);
router.get("/profile",auth.isLogin,UserController.loadProfile);
router.post('/profile/update',auth.isLogin, UserController.updateProfile);
// In userRouter.js


router.get('/shop',UserController.loadShopPage);

router.get('/filteredProducts', UserController.getFilteredProducts);
// In userRouter.js
router.get('/singleproduct/:id', UserController.getProductDetails);
router.get('/shop/singleproduct/:id', UserController.getProductDetails);
//address
router.get('/address',auth.isLogin,UserController.loadAddressPage);
router.post('/address/add',auth.isLogin, UserController.addAddress);
router.post('/address/edit/:id',auth.isLogin, UserController.editAddress);
router.get('/address/delete/:id',auth.isLogin, UserController.deleteAddress);

// cart
router.post('/add-to-cart/:id',auth.isLogin, cartController.addToCart);
router.get('/cart',auth.isLogin, cartController.getCart);
router.post('/update-cart',auth.isLogin,cartController.updateCart);
router.post('/remove-from-cart',auth.isLogin,cartController.removeFromCart);

// forgot password
router.get('/forgot-password', UserController.loadForgotPassword);
router.post('/forgot-password', UserController.handleForgotPassword);

router.get('/reset-password/:token', UserController.loadResetPassword);
router.post('/reset-password/:token', UserController.handleResetPassword);


// checkout
router.get('/checkout',auth.isLogin,checkoutController.loadCheckout);
router.post('/verify-payment',auth.isLogin,checkoutController.verifyPayment);
router.post('/create-razorpay-order',auth.isLogin, checkoutController.createRazorpayOrder);
router.post('/checkout/add-address',auth.isLogin, checkoutController.checkoutAddAddress);
router.post('/checkout/edit/:id',auth.isLogin,checkoutController.checkoutEditAddress);
router.delete('/checkout/delete/:id',auth.isLogin,checkoutController.checkoutDeleteAddress);

router.post('/place',auth.isLogin, UserController.placeOrder);
router.get('/orderSummary/:orderId',auth.isLogin, UserController.orderSummary);

router.get('/orders',auth.isLogin, UserController.renderOrdersPage);
router.get('/viewOrder/:orderId',auth.isLogin, UserController.renderViewOrder);
router.post('/cancelOrderItem',auth.isLogin, UserController.cancelOrderItem);
router.post('/requestReturn',auth.isLogin, UserController.requestReturn);

// router.get('/wishlist',UserController.loadWishList);
// router.get('/wishlist/add/:productId', UserController.addToWishlist);
router.get('/wishlist',auth.isLogin, UserController.getWishlist);
router.post('/wishlist/add/:productId',auth.isLogin,UserController.addToWishlist);
router.post('/wishlist/remove/:productId',auth.isLogin,  UserController.removeFromWishlist);

// apply coupons
router.post('/apply-coupon',auth.isLogin, UserController.applyCoupon);
router.post('/remove-coupon',auth.isLogin,UserController.removeCoupon)

// wallet
router.get('/wallet',auth.isLogin, UserController.renderWalletPage);
router.get('/wallet/balance',auth.isLogin, UserController.getWalletBalance);
router.get('/wallet/transactions',auth.isLogin, UserController.getWalletTransactions);
router.get('/downloadInvoice/:orderId',auth.isLogin, UserController.downloadInvoice);











router.get('/auth/google', 
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback',
    passport.authenticate('google',{ failureRedirect:"/login" }),
    async (req, res) => {
        req.session.user_id = req.session.passport.user._id;
        console.log('req.session.user_id: ', req.session.user_id);
        
        res.redirect('/home');
    }

);

router.get('/auth/google', (req, res, next) => {
    console.log('Google Auth Request');
    next();
}, passport.authenticate('google', { scope: ['profile', 'email'] }));









module.exports = router;
