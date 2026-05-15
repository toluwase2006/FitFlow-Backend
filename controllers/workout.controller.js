const mongoose = require('mongoose');
const WorkoutPlan = require('../models/workout.model');
const User = require('../models/user.model');
const TrainerTrainee = require('../models/trainerTrainee.model');

const createWorkoutPlan = async (req, res) => {
  const { traineeId, title, exercises, duration, description, status } = req.body;

  if (!traineeId || !title) {
    return res.status(400).json({ message: 'traineeId and title are required' });
  }

  try {
    const trainee = await User.findById(traineeId);
    if (!trainee || trainee.role !== 'trainee') {
      return res.status(400).json({ message: 'Valid traineeId is required' });
    }

    const assignment = await TrainerTrainee.findOne({
      trainerId: req.user.id,
      traineeId,
      isActive: true
    });
    if (!assignment) {
      return res.status(403).json({ message: 'You are not assigned to this trainee' });
    }

    const workoutPlan = new WorkoutPlan({
      trainerId: req.user.id,
      traineeId,
      title,
      description,
      status: status || 'draft',
      exercises: Array.isArray(exercises) ? exercises : [],
      duration: duration || 0,
    });

    await workoutPlan.save();
    res.status(201).json({ message: 'Workout plan created successfully', workoutPlan });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ── GET /api/workouts ─────────────────────────────────────────────────────────
// Trainer  → sees all plans they created
// Trainee  → sees all plans assigned to them (any status)
// Admin    → sees everything
const getWorkoutPlans = async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'trainer') {
      query.trainerId = req.user.id;
    } else if (req.user.role === 'trainee') {
      query.traineeId = req.user.id;   // ← returns ALL plans, not just active
    }
    // admin: no filter → all plans

    const workoutPlans = await WorkoutPlan.find(query)
      .populate('trainerId', 'firstName lastName email')
      .populate('traineeId', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.status(200).json({ workoutPlans });
  } catch (error) {
    console.error('getWorkoutPlans error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ── GET /api/workouts/:id ─────────────────────────────────────────────────────
// Trainee can fetch their own plan by ID
// Trainer can fetch plans they created
// Admin can fetch any plan
const getWorkoutPlanById = async (req, res) => {
  const { id } = req.params;


  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid plan ID' });
  }

  try {
    const workoutPlan = await WorkoutPlan.findById(id)
      .populate('trainerId', 'firstName lastName email')
      .populate('traineeId', 'firstName lastName email');

    if (!workoutPlan) {
      return res.status(404).json({ message: 'Workout plan not found' });
    }

    const trainerId = workoutPlan.trainerId?._id?.toString() ?? workoutPlan.trainerId?.toString();
    const traineeId = workoutPlan.traineeId?._id?.toString() ?? workoutPlan.traineeId?.toString();

    const isTrainer = req.user.role === 'trainer' && trainerId === req.user.id;
    const isTrainee = req.user.role === 'trainee' && traineeId === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isTrainer && !isTrainee && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to view this plan' });
    }

    res.status(200).json({ workoutPlan });
  } catch (error) {
    console.error('getWorkoutPlanById error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ── GET /api/workouts/my-plans ────────────────────────────────────────────────
// Trainee only — returns plans assigned to them with trainer info
// Also verifies the trainer-trainee assignment is still active
const getMyPlans = async (req, res) => {
  try {
    console.log('Looking for traineeId:', req.user.id);
    if (req.user.role !== 'trainee') {
      return res.status(403).json({ message: 'Only trainees can access this endpoint' });
    }

    // Find all active trainer assignments for this trainee
    const assignments = await TrainerTrainee.find({
      traineeId: req.user.id,
      isActive: true,
    }).populate('trainerId', 'firstName lastName email');

    // Get all workout plans assigned to this trainee
    const workoutPlans = await WorkoutPlan.find({ traineeId: req.user.id })
      .populate('trainerId', 'firstName lastName email profileImage')
      .populate('traineeId', 'firstName lastName email')
      .sort({ createdAt: -1 });

    console.log('plans found:', workoutPlans.length);

    // Attach whether the trainer is still actively assigned
    const plansWithMeta = workoutPlans.map(plan => {
      const plainPlan = plan.toObject();
      const trainerIdStr = plainPlan.trainerId?._id?.toString();
      const activeAssignment = assignments.find(
        a => a.trainerId?._id?.toString() === trainerIdStr
      );
      return {
        ...plainPlan,
        trainerIsActive: !!activeAssignment,
        assignedAt: activeAssignment?.assignedAt ?? null,
      };
    });

    res.status(200).json({
      total: plansWithMeta.length,
      workoutPlans: plansWithMeta,
    });
  } catch (error) {
    console.error('getMyPlans error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateWorkoutPlan = async (req, res) => {
  const { id } = req.params;
  const { title, exercises, duration, traineeId, status } = req.body;

  try {
    const workoutPlan = await WorkoutPlan.findById(id);
    if (!workoutPlan) {
      return res.status(404).json({ message: 'Workout plan not found' });
    }

    if (req.user.role !== 'trainer' || workoutPlan.trainerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to update this workout plan' });
    }

    if (traineeId) {
      const trainee = await User.findById(traineeId);
      if (!trainee || trainee.role !== 'trainee') {
        return res.status(400).json({ message: 'Valid traineeId is required' });
      }
      const assignment = await TrainerTrainee.findOne({
        trainerId: req.user.id,
        traineeId,
        isActive: true
      });
      if (!assignment) {
        return res.status(403).json({ message: 'You are not assigned to this trainee' });
      }
      workoutPlan.traineeId = traineeId;
    }

    if (title !== undefined) workoutPlan.title = title;
    if (status !== undefined) workoutPlan.status = status;  // ← was missing!
    if (exercises !== undefined) workoutPlan.exercises = Array.isArray(exercises) ? exercises : workoutPlan.exercises;
    if (duration !== undefined) workoutPlan.duration = duration;

    await workoutPlan.save();
    res.status(200).json({ message: 'Workout plan updated successfully', workoutPlan });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteWorkoutPlan = async (req, res) => {
  const { id } = req.params;

  try {
    const workoutPlan = await WorkoutPlan.findById(id);
    if (!workoutPlan) {
      return res.status(404).json({ message: 'Workout plan not found' });
    }

    if (req.user.role !== 'trainer' || workoutPlan.trainerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to delete this workout plan' });
    }

    await workoutPlan.deleteOne();
    res.status(200).json({ message: 'Workout plan deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createWorkoutPlan,
  getWorkoutPlans,
  getWorkoutPlanById,
  getMyPlans,
  updateWorkoutPlan,
  deleteWorkoutPlan,
};