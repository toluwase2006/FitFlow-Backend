const express = require('express');

const { sendMessage, getMessage } = require('../controllers/aimessage.controller');

const router = express.Router();


router.post('/', sendMessage);

router.get('/history', getMessage);

module.exports = router;