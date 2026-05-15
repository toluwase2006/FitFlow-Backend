const Session = require('../models/session.model');
const WorkoutPlan = require('../models/workout.model');

const createSession = async (req, res) => {
  const { workoutPlanId, exercisesDone, duration, date, notes } = req.body;

  if (!workoutPlanId || !Array.isArray(exercisesDone) || exercisesDone.length === 0) {
    return res.status(400).json({ message: 'workoutPlanId and exercisesDone are required' });
  }

  try {
    const workoutPlan = await WorkoutPlan.findById(workoutPlanId);
    if (!workoutPlan) {
      return res.status(404).json({ message: 'Workout plan not found' });
    }

    if (workoutPlan.traineeId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only log sessions for your own workout plans' });
    }

    const session = new Session({
      traineeId: req.user.id,
      workoutPlanId,
      exercisesDone,
      duration: duration || 0,
      notes: notes || undefined,
      date: date ? new Date(date) : undefined
    });

    await session.save();
    res.status(201).json({ message: 'Session logged successfully', session });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getSessions = async (req, res) => {
  try {
    const sessions = await Session.find({ traineeId: req.user.id })
      .populate('workoutPlanId', 'title duration')
      .sort({ date: -1 });

    res.status(200).json({ sessions });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { createSession, getSessions };