const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Products storage (existing)
const productStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'fitflow/products',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 800, height: 600, crop: 'limit', quality: 'auto' }],
    },
});

// Avatar storage (new)
const avatarStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'fitflow/avatars',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 300, height: 300, crop: 'fill', gravity: 'face', quality: 'auto' }],
    },
});

const upload        = multer({ storage: productStorage, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadAvatar  = multer({ storage: avatarStorage,  limits: { fileSize: 3 * 1024 * 1024 } });

module.exports = { cloudinary, upload, uploadAvatar }; 