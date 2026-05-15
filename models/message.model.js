const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for fast thread lookups in both directions
messageSchema.index({ senderId: 1, receiverId: 1 });
messageSchema.index({ receiverId: 1, senderId: 1 });



module.exports =
  mongoose.models.Message || mongoose.model('Message', messageSchema);
