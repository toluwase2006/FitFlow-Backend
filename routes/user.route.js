const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const { uploadAvatar } = require('../config/cloudinary');
const { getMe, updateMe } = require('../controllers/user.controller');

router.get('/me',  auth, getMe);
router.put('/me',  auth, uploadAvatar.single('avatar'), updateMe);

module.exports = router;