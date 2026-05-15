const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const checkRole = require('../middleware/checkRole.middleware');
const { getNearbyTrainers, getAssignedClients, getAssignedTrainer, getMyTrainer } = require('../controllers/trainer.controller');

const trainerOnly = [auth, checkRole('trainer')];
const traineeOnly = [auth, checkRole('trainee')];

router.get('/nearby', auth, getNearbyTrainers);
router.get('/clients', trainerOnly, getAssignedClients);
router.get('/assigned-trainer', traineeOnly, getAssignedTrainer);
router.get('/my-trainer', auth, checkRole('trainee'), getMyTrainer);

module.exports = router;