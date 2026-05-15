const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const checkRole = require('../middleware/checkRole.middleware');
const { sendMessage, getMessages } = require('../controllers/message.controller');

const trainerOrTrainee = [auth, checkRole('trainer', 'trainee')];

router.post('/', trainerOrTrainee, sendMessage);
router.get('/:userId', trainerOrTrainee, getMessages);

module.exports = router;
