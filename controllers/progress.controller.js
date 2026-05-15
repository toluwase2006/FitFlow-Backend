const Session = require('../models/session.model');
const TrainerTrainee = require('../models/trainerTrainee.model');

const getProgress = async (req, res) => {
  try {
    const { traineeId } = req.params;
    const requesterId = req.user.id;
    const requesterRole = req.user.role;

    // Access control: trainee can only see their own progress;
    // trainer can only see progress for a trainee they are assigned to
    if (requesterRole === 'trainee') {
      if (requesterId !== traineeId) {
        return res.status(403).json({ message: 'You can only view your own progress' });
      }
    } else if (requesterRole === 'trainer') {
      const assignment = await TrainerTrainee.findOne({
        trainerId: requesterId,
        traineeId,
        isActive: true
      });
      if (!assignment) {
        return res.status(403).json({ message: 'You are not assigned to this trainee' });
      }
    } else if (requesterRole !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const sessions = await Session.find({ traineeId })
      .populate('workoutPlanId', 'title duration')
      .sort({ date: 1 });

    if (sessions.length === 0) {
      return res.status(200).json({
        stats: { totalSessions: 0, totalDuration: 0, avgDuration: 0, exercisesLogged: 0 },
        sessions: []
      });
    }

    // Aggregate stats
    const totalSessions = sessions.length;
    const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const avgDuration = Math.round(totalDuration / totalSessions);
    const exercisesLogged = sessions.reduce((sum, s) => sum + (s.exercisesDone?.length || 0), 0);

    // Group sessions by ISO week (YYYY-Www)
    const byWeek = {};
    sessions.forEach(s => {
      const d = new Date(s.date);
      const startOfYear = new Date(d.getFullYear(), 0, 1);
      const weekNum = Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
      const key = `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
      if (!byWeek[key]) byWeek[key] = [];
      byWeek[key].push(s);
    });

    res.status(200).json({
      stats: { totalSessions, totalDuration, avgDuration, exercisesLogged },
      byWeek,
      sessions
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { getProgress };
