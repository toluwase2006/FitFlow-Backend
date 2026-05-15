const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },

    description: {
        type: String,
        trim: true,
        default: ''
    },

    // Price stored in Naira (₦)
    price: {
        type: Number,
        required: true,
        min: 0
    },

    // Full image URL or placeholder URL
    imageUrl: {
        type: String,
        default: 'https://placehold.co/400x300/1a1a2e/e0e0e0?text=Product+Image'
    },

    // Which dashboard this product appears on
    targetAudience: {
        type: String,
        enum: ['trainer', 'trainee', 'both'],
        required: true
    },

    category: {
        type: String,
        trim: true,
        default: 'General'
    },

    stock: {
        type: Number,
        default: 0,
        min: 0
    },

    isActive: {
        type: Boolean,
        default: true
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports =
    mongoose.models.Product ||
    mongoose.model('Product', productSchema);
