const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  sets:        { type: Number, default: 0 },
  reps:        { type: Number, default: 0 },
  duration:    { type: Number, default: 0 },
  restSeconds: { type: Number, default: 0 },
  orderIndex:  { type: Number, default: 0 },
  notes:       { type: String, trim: true, default: '' }
});

const workoutPlanSchema = new mongoose.Schema({
  trainerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  traineeId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:       { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  status:      { type: String, enum: ['draft', 'active', 'archived'], default: 'draft' },
  exercises:   { type: [exerciseSchema], default: [] },
  duration:    { type: Number, default: 0 },
  createdAt:   { type: Date, default: Date.now }
});

const WorkoutPlan = mongoose.model('WorkoutPlan', workoutPlanSchema);
module.exports = WorkoutPlan;