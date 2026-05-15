const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const { getProgress } = require('../controllers/progress.controller');

// Trainer, trainee (and admin) can access — role check is inside the controller
router.get('/:traineeId', auth, getProgress);

module.exports = router;
