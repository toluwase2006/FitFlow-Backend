const express = require('express');
const router = express.Router();

const { register, Login} = require('../controllers/auth.controller');
const auth = require('../middleware/auth.middleware');

// Registration Route
router.post('/register', register); 

// Login Route
router.post('/login', Login);


// Protected Route 
router.get('/protected', auth, (req, res) => {
    res.status(200).json({ 
        message: "This is a protected route", 
        user: req.user  
    });
});

module.exports = router;