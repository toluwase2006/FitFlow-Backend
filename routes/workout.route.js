const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const checkRole = require('../middleware/checkRole.middleware');
const { createWorkoutPlan, getWorkoutPlans, updateWorkoutPlan, deleteWorkoutPlan, getWorkoutPlanById,getMyPlans } = require('../controllers/workout.controller');

router.get('/my-plans', auth, getMyPlans); 
router.post('/', auth, checkRole('trainer'), createWorkoutPlan);
router.get('/', auth, getWorkoutPlans);
router.get('/:id', auth, getWorkoutPlanById);
router.put('/:id', auth, checkRole('trainer'), updateWorkoutPlan);
router.delete('/:id', auth, checkRole('trainer'), deleteWorkoutPlan);

module.exports = router;