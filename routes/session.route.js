const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const checkRole = require('../middleware/checkRole.middleware');
const { createSession, getSessions } = require('../controllers/session.controller');

router.post('/', auth, checkRole('trainee'), createSession);
router.get('/', auth, checkRole('trainee'), getSessions);

module.exports = router;