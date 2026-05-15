const User = require('../models/user.model');
const TrainerTrainee = require('../models/trainerTrainee.model');

const getNearbyTrainers = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.user.role !== 'trainee') {
      return res.status(403).json({ message: 'Only trainees can access nearby trainers' });
    }

    if (!currentUser.city || !currentUser.state) {
      return res.status(400).json({ message: 'Please set your city and state in your profile first' });
    }

    const activeAssignment = await TrainerTrainee.findOne({
      traineeId: currentUser._id,
      isActive: true
    }).populate({
      path: 'trainerId',
      match: { isActive: true },
      select: '-password'
    });

    if (activeAssignment && activeAssignment.trainerId) {
      return res.status(200).json({ trainers: [activeAssignment.trainerId] });
    }

    const nearbyTrainers = await User.find({
      role: 'trainer',
      isActive: true,
      city: currentUser.city,
      state: currentUser.state
    }).select('-password');

    res.status(200).json({ trainers: nearbyTrainers });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getAssignedClients = async (req, res) => {
  try {
    if (req.user.role !== 'trainer') {
      return res.status(403).json({ message: 'Only trainers can access assigned clients' });
    }

    const assignments = await TrainerTrainee.find({
      trainerId: req.user.id,
      isActive: true
    }).populate('traineeId', 'firstName lastName email city state country bio');

    const clients = assignments
      .filter((assignment) => assignment.traineeId)
      .map(({ traineeId }) => ({
        id: traineeId._id.toString(),  // ← force string
        _id: traineeId._id.toString(), // ← add this too for frontend normaliser
        full_name: `${traineeId.firstName || ''} ${traineeId.lastName || ''}`.trim() || traineeId.email,
        bio: traineeId.bio || 'No bio',
        email: traineeId.email,
        city: traineeId.city,
        state: traineeId.state,
        country: traineeId.country
      }));

    res.status(200).json({ clients });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getAssignedTrainer = async (req, res) => {
  try {
    if (req.user.role !== 'trainee') {
      return res.status(403).json({ message: 'Only trainees can access assigned trainer' });
    }

    const activeAssignment = await TrainerTrainee.findOne({
      traineeId: req.user.id,
      isActive: true
    }).populate('trainerId', '-password');

    if (!activeAssignment || !activeAssignment.trainerId) {
      return res.status(200).json({ trainer: null });
    }

    res.status(200).json({ trainer: activeAssignment.trainerId });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getMyTrainer = async (req, res) => {
  try {
    const assignment = await TrainerTrainee.findOne({
      traineeId: req.user.id,
      isActive: true,
    }).populate('trainerId', 'firstName lastName email');

    if (!assignment || !assignment.trainerId) {
      return res.status(404).json({ message: 'No trainer assigned' });
    }

    res.status(200).json({ trainer: assignment.trainerId });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Add to exports

module.exports = { getNearbyTrainers, getAssignedClients, getAssignedTrainer, getMyTrainer };