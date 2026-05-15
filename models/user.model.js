const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true
    },

    lastName: {
        type: String,
        required: true,
        trim: true
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },

    password: {
        type: String,
        required: true,
        minlength: 6
    },

    role: {
        type: String,
        enum: ['trainer', 'trainee', 'admin'],
        default: 'trainee'
    },

    country: {
        type: String,
        trim: true
    },

    state: {
        type: String,
        trim: true
    },

    city: {
        type: String,
        trim: true
    },


    profileImage: {
        type: String
    },

    phone: {
        type: String,
        trim: true
    },

    bio: {
        type: String,
        maxlength: 300
    },

    isActive: {
        type: Boolean,
        default: true  // admin can deactivate accounts
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

User = mongoose.model('User', userSchema);
module.exports = User;