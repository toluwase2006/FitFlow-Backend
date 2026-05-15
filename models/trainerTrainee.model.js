const mongoose = require('mongoose');

const trainerTraineeSchema = new mongoose.Schema({
    trainerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    traineeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    isActive: {
        type: Boolean,
        default: true
    },

    assignedAt: {
        type: Date,
        default: Date.now
    }
});

// Prevent a trainee from having more than one active assignment
trainerTraineeSchema.index({ traineeId: 1, isActive: 1 });

const TrainerTrainee = mongoose.model('TrainerTrainee', trainerTraineeSchema);
module.exports = TrainerTrainee;
