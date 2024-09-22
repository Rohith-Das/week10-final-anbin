const User = require('../model/userModel');
const Category = require('../model/categoryModel');
const Brand = require('../model/brandModel');
const Product = require('../model/productModel');
const { query } = require('express');
const multer = require('../middleware/multer');






const loadProducts = async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const categories = await Category.find();
      const brands = await Brand.find();
  
      const totalProducts = await Product.countDocuments();
      const totalPages = Math.ceil(totalProducts / limit);
      const currentPage = Math.max(1, Math.min(page, totalPages));
  
      const products = await Product.find()
        .populate('category')
        .populate('brand')
        .skip((currentPage - 1) * limit)
        .limit(limit);
  
      res.render('product', {
        categories,
        products,
        brands,
        currentPage,
        totalPages
      });
    } catch (error) {
      console.error(error);
      res.status(500).send('Server Error');
    }
  };
  
  const loadAddProduct = async (req, res) => {
    try {
        const categories = await getActiveCategories();
        const brands = await getActiveBrands();
        res.render('addProduct', { categories, brands });
    } catch (err) {
        console.error('Error fetching categories or brands:', err);
        res.status(500).send('Internal Server Error');
    }
};

const addProduct = async (req, res) => {
    try {
        // console.log('Request Body:', req.body);
        const {
            productName,
            stockQuantity,
            category,
            price,
            stock,
            description,
            brand,
            thickness,
            shape,
            waterResistance,
            warrantyPeriod
        } = req.body;

        const newProduct = new Product({
            productName,
            stockQuantity,
            category,
            price,
            stock,
            description,
            brand,
            thickness,
            shape,
            waterResistance,
            warrantyPeriod,
            images: req.files.map(file => `/uploads/products/${file.filename}`), 
            imageUrl: req.files.length > 0 ? `/uploads/products/${req.files[0].filename}` : null
        });

        await newProduct.save();
        
        // Send a JSON response instead of redirecting
        res.json({ success: true, message: 'Product added successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};




const loadEditProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId)
            .populate('category')
            .populate('brand');

        if (!product) {
            return res.status(404).send('Product not found');
        }

        // Ensure strapDetails exists
        if (!product.strapDetails) {
            product.strapDetails = {};
        }

        console.log('Product strap details:', product.strapDetails);  
        // Fetch all active categories and brands
        const categories = await Category.find({ is_delete: false, status: 'active' });
        const brands = await Brand.find({ is_deleted: false });

        res.render('editProduct', {
            product,
            categories,
            brands
        });
    } catch (error) {
        console.error('Error loading edit product page:', error);
        res.status(500).send('Server Error');
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
const editProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const {
            productName,
            stockQuantity,
            category,
            price,
            description,
            brand,
            thickness,
            shape,
            waterResistance,
            warrantyPeriod,
            status,
            'strapDetails.width': strapWidth,
            existingImages
        } = req.body;

        console.log('Received form data:', req.body);
        console.log('Received files:', req.files);

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Update product details
        product.productName = productName;
        product.stockQuantity = parseInt(stockQuantity);
        product.category = category;
        product.price = parseFloat(price);
        product.description = description;
        product.brand = brand;
        product.thickness = parseFloat(thickness);
        product.shape = shape;
        product.waterResistance = waterResistance;
        product.warrantyPeriod = warrantyPeriod;
        product.isListed = status === 'Listed';
        product.strapDetails = { ...product.strapDetails, width: parseFloat(strapWidth) };

        // Handle images
        let updatedImages = new Array(3).fill(null);
        let newImageIndex = 0;

        for (let i = 0; i < 3; i++) {
            if (existingImages[i] && existingImages[i] !== '') {
                // Keep existing image
                updatedImages[i] = existingImages[i];
            } else if (req.files && req.files[newImageIndex]) {
                // Add new image
                updatedImages[i] = `/uploads/products/${req.files[newImageIndex].filename}`;
                newImageIndex++;
            }
            // If neither condition is met, the slot remains null (image removed)
        }

        product.images = updatedImages.filter(img => img !== null);
        product.imageUrl = product.images[0] || null;

        await product.save();
        console.log(product)

        res.json({ success: true, message: 'Product updated successfully' });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ success: false, message: 'An error occurred while updating the product' });
    }
};

const toggleProductStatus = async (req, res) => {
    try {
      const productId = req.params.productId;
      const product = await Product.findById(productId);
  
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
  
      product.is_deleted = !product.is_deleted;
      await product.save();
  
      return res.json({ success: true, is_deleted: product.is_deleted });
    } catch (error) {
      console.error('Error toggling product status:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };

  module.exports={
    loadProducts,
    loadAddProduct,
    addProduct,
    loadEditProduct,
    editProduct,
    toggleProductStatus,
  }