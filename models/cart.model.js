const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1
    },
    // Snapshot the price at the time of adding so price changes don't affect open carts
    priceAtAdd: {
        type: Number,
        required: true,
        min: 0
    }
}, { _id: false });

const cartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true   // one cart per user
    },

    items: [cartItemSchema],

    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Keep updatedAt fresh automatically
cartSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports =
    mongoose.models.Cart ||
    mongoose.model('Cart', cartSchema);
