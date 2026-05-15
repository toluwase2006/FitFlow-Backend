const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const { getMe, updateMe } = require('../controllers/user.controller');

router.get('/me', auth, getMe);
router.put('/me', auth, updateMe);

module.exports = router;