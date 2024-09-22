const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',  // Ensure this matches the name of your User model
        required: true
    },
    items: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',  // Ensure this matches the name of your Product model
                required: true,
            },
            dateAdded: {
                type: Date,
                default: Date.now
            }
        }
    ]
});

// Create the Wishlist model
module.exports = mongoose.model('Wishlist', wishlistSchema);
