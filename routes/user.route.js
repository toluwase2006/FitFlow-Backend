const { uploadAvatar } = require('../config/cloudinary');
const { getMe, updateMe } = require('../controllers/user.controller');
const auth = require('../middleware/auth.middleware');

router.get('/me',  auth, getMe);
router.put('/me',  auth, uploadAvatar.single('avatar'), updateMe);