const express = require('express');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv').config();
const userRouter = require('./routes/userRouter');
const adminRouter = require('./routes/adminRouter');
const breadcrumbMiddleware = require('./middleware/breadcrumbs');

const app = express();

// Load Passport configuration
require('./config/passport');

// MongoDB Connection
mongoose.connect("mongodb://localhost:27017/roshow")
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB connection error:', err));



    require('./model/userModel');
require('./model/categoryModel');
require('./model/brandModel');
require('./model/productModel');
require('./model/orderModel');
require('./model/offerModel');

// Middleware
app.use(express.json()); // To handle JSON requests
app.use(express.urlencoded({ extended: true })); // To handle URL-encoded data

app.use(session({
    secret: process.env.SESSION_SECRET || 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(breadcrumbMiddleware);

// Middleware to pass user data to views
app.use((req, res, next) => {
    res.locals.user = req.user; // Makes `req.user` available to all views
    next();
});

// Static Files
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// View Engine
app.set('view engine', 'ejs');
app.set('views', [path.join(__dirname, 'views/user'), path.join(__dirname, 'views/admin')]);

app.use('/assets', express.static(path.join(__dirname, './public/assets')));
app.use('/dashboard-assets', express.static(path.join(__dirname, './public/dashboard-assets')));

// Routes
app.use('/', userRouter);
app.use('/admin', adminRouter);

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});