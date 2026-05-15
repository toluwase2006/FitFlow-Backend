const mongoose = require('mongoose');

const sessionExerciseSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  sets: { type: Number, default: 0 },
  reps: { type: Number, default: 0 },
  duration: { type: Number, default: 0 },
  notes: { type: String, trim: true }
});

const sessionSchema = new mongoose.Schema({
  traineeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workoutPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkoutPlan', required: true },
  exercisesDone: { type: [sessionExerciseSchema], default: [] },
  duration: { type: Number, default: 0 },
  notes: { type: String, trim: true },
  date: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

const Session = mongoose.model('Session', sessionSchema);
module.exports = Session;