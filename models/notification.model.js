const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    type: {
        type: String,
        enum: ['message', 'system', 'product'],
        default: 'system'
    },

    title: {
        type: String,
        required: true,
        trim: true
    },

    body: {
        type: String,
        trim: true,
        default: ''
    },

    isRead: {
        type: Boolean,
        default: false
    },

    // Optional: link back to the related document (e.g. message _id, product _id)
    relatedId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index for efficient per-user unread queries
notificationSchema.index({ userId: 1, isRead: 1 });

module.exports =
    mongoose.models.Notification ||
    mongoose.model('Notification', notificationSchema);
