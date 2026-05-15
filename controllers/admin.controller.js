const User = require('../models/user.model');
const TrainerTrainee = require('../models/trainerTrainee.model');
const Session = require('../models/session.model');



// GET /api/admin/users
// List all users with city, state, role
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.status(200).json({ users });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// GET /api/admin/unassigned
// List trainees not yet assigned to any trainer
const getUnassignedTrainees = async (req, res) => {
    try {
        // Find all trainee IDs that currently have an active assignment
        const activeAssignments = await TrainerTrainee.find({ isActive: true }).select('traineeId');
        const assignedIds = activeAssignments.map(a => a.traineeId.toString());

        const unassignedTrainees = await User.find({
            role: 'trainee',
            isActive: true,
            _id: { $nin: assignedIds }
        }).select('-password');

        res.status(200).json({ unassignedTrainees });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// GET /api/admin/trainers
// List all trainers with how many active trainees they have
const getAllTrainersWithCount = async (req, res) => {
    try {
        const trainers = await User.find({ role: 'trainer' }).select('-password');

        // Build a map of trainerId => active trainee count
        const assignmentCounts = await TrainerTrainee.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: '$trainerId', count: { $sum: 1 } } }
        ]);
        const countMap = {};
        assignmentCounts.forEach(a => { countMap[a._id.toString()] = a.count; });

        const trainersWithCount = trainers.map(t => ({
            ...t.toObject(),
            traineeCount: countMap[t._id.toString()] || 0
        }));

        res.status(200).json({ trainers: trainersWithCount });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// PATCH /api/admin/users/:id
// Update a user's role or deactivate their account
const updateUser = async (req, res) => {
    try {
        const { role, isActive } = req.body;
        const allowedRoles = ['trainer', 'trainee', 'admin'];

        if (role && !allowedRoles.includes(role)) {
            return res.status(400).json({ message: `Role must be one of: ${allowedRoles.join(', ')}` });
        }

        const updates = {};
        if (role !== undefined) updates.role = role;
        if (isActive !== undefined) updates.isActive = isActive;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: 'No valid fields to update. Provide role and/or isActive.' });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'User updated successfully', user });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// DELETE /api/admin/users/:id
// Permanently delete a user
const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Also clean up any assignment records for this user
        await TrainerTrainee.deleteMany({
            $or: [{ trainerId: req.params.id }, { traineeId: req.params.id }]
        });

        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// DAY 9 — Trainer-Trainee Assignments
// ─────────────────────────────────────────────

// POST /api/admin/assign
// Assign a trainee to a trainer
const assignTrainee = async (req, res) => {
    try {
        const { traineeId, trainerId } = req.body;

        if (!traineeId || !trainerId) {
            return res.status(400).json({ message: 'traineeId and trainerId are required' });
        }

        // Validate both users exist
        const [trainee, trainer] = await Promise.all([
            User.findById(traineeId),
            User.findById(trainerId)
        ]);

        if (!trainee) return res.status(404).json({ message: 'Trainee not found' });
        if (!trainer) return res.status(404).json({ message: 'Trainer not found' });

        // Validate roles
        if (trainee.role !== 'trainee') {
            return res.status(400).json({ message: 'The specified user is not a trainee' });
        }
        if (trainer.role !== 'trainer') {
            return res.status(400).json({ message: 'The specified user is not a trainer' });
        }

        // Validate same city
        if (!trainee.city || !trainer.city || trainee.city.toLowerCase() !== trainer.city.toLowerCase()) {
            return res.status(400).json({ message: 'Trainee and trainer must be in the same city' });
        }

        // Check trainee is not already assigned
        const existing = await TrainerTrainee.findOne({ traineeId, isActive: true });
        if (existing) {
            return res.status(409).json({ message: 'This trainee is already assigned to a trainer' });
        }

        const assignment = await TrainerTrainee.create({ trainerId, traineeId });

        const populated = await assignment.populate([
            { path: 'trainerId', select: 'firstName lastName email city' },
            { path: 'traineeId', select: 'firstName lastName email city' }
        ]);

        res.status(201).json({ message: 'Trainee assigned successfully', assignment: populated });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// DELETE /api/admin/unassign/:traineeId
// Remove an active assignment (soft delete)
const unassignTrainee = async (req, res) => {
    try {
        const { traineeId } = req.params;

        const assignment = await TrainerTrainee.findOneAndUpdate(
            { traineeId, isActive: true },
            { $set: { isActive: false } },
            { new: true }
        );

        if (!assignment) {
            return res.status(404).json({ message: 'No active assignment found for this trainee' });
        }

        res.status(200).json({ message: 'Trainee unassigned successfully', assignment });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// GET /api/admin/assignments
// List all currently active assignments with populated trainer and trainee info
const getActiveAssignments = async (req, res) => {
    try {
        const assignments = await TrainerTrainee.find({ isActive: true })
            .populate('trainerId', 'firstName lastName email city state country')
            .populate('traineeId', 'firstName lastName email city state country');

        res.status(200).json({ assignments });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// GET /api/admin/stats
// Dashboard overview counts for admin
const getAdminStats = async (req, res) => {
    try {
        const [
            totalUsers,
            totalTrainers,
            totalTrainees,
            totalAdmins,
            activeAssignments,
            totalSessions
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ role: 'trainer' }),
            User.countDocuments({ role: 'trainee' }),
            User.countDocuments({ role: 'admin' }),
            TrainerTrainee.countDocuments({ isActive: true }),
            Session.countDocuments()
        ]);

        res.status(200).json({
            stats: {
                totalUsers,
                totalTrainers,
                totalTrainees,
                totalAdmins,
                activeAssignments,
                totalSessions
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    getAllUsers,
    getUnassignedTrainees,
    getAllTrainersWithCount,
    updateUser,
    deleteUser,
    assignTrainee,
    unassignTrainee,
    getActiveAssignments,
    getAdminStats
};
