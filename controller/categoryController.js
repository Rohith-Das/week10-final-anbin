const User = require('../model/userModel');
const Category = require('../model/categoryModel');
const Product = require('../model/productModel');
const { query } = require('express');



const loadCategory = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query; // Get page and limit from query parameters
        const search = req.query.search || '';

        const query = {
            $or: [
                { categoryName: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ]
        };

        const totalCategories = await Category.countDocuments(query);
        const totalPages = Math.ceil(totalCategories / limit);
        const currentPage = Math.max(1, Math.min(page, totalPages)); // Ensure valid page number

        const categories = await Category.find(query)
            .skip((currentPage - 1) * limit)
            .limit(limit);

        res.render('categoryList', {
            categories,
            search,
            currentPage,
            totalPages
        });
    } catch (error) {
        res.send(error.message);
    }
};

const addCategory = async (req, res) => {
    try {
        const { categoryName, description, status } = req.body;
        const existingCategory = await Category.findOne({ categoryName });

        if (existingCategory) {
            const categories = await Category.find();
            return res.render('categoryList', { 
                categories, 
                message: 'Category already exists' 
            });
        }

        const newCategory = new Category({ categoryName, description, status });
        await newCategory.save();

        res.redirect('/admin/dashboard/categoryList');
    } catch (error) {
        res.status(500).send(error.message);
    }
};


const editCategory = async (req, res) => {
    try {
        const { id, categoryName, description, status } = req.body;
        const updatedCategory = await Category.findByIdAndUpdate(id, { categoryName, description, status }, { new: true });

        if (updatedCategory) {
            res.redirect('/admin/dashboard/categoryList');
        } else {
            res.redirect('/admin/dashboard/categoryList', { message: 'Category not found' });
        }
    } catch (error) {
        res.status(500).send(error.message);
    }
};


const toggleCategoryStatus = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const category = await Category.findById(categoryId);

        if (category) {
            category.is_delete = !category.is_delete;
            await category.save();
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, message: 'Category not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const listCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        await Category.findByIdAndUpdate(categoryId, { is_delete: false });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
};

const unlistCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        await Category.findByIdAndUpdate(categoryId, { is_delete: true });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
};

module.exports={
    loadCategory,
    addCategory,
    editCategory ,
    toggleCategoryStatus,
    listCategory,
    unlistCategory,  
}