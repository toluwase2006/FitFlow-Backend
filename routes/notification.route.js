const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllRead,
    deleteNotification
} = require('../controllers/notification.controller');

// All notification routes require authentication (any role)
router.use(auth);

router.get('/',            getNotifications);
router.get('/count',       getUnreadCount);
router.patch('/read-all',  markAllRead);
router.patch('/:id/read',  markAsRead);
router.delete('/:id',      deleteNotification);

module.exports = router;
