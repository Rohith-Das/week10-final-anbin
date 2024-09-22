const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
    brandName: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        required: true
    },
    is_deleted: {
        type: Boolean,
        default: false
    }
});

const Brand = mongoose.model('Brand', brandSchema);

module.exports = Brand;
