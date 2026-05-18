const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const checkRole = require('../middleware/checkRole.middleware');
const { upload } = require('../config/cloudinary');
const {
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct
} = require('../controllers/product.controller');

const adminOnly   = [auth, checkRole('admin')];
const anyLoggedIn = [auth];

// ADD YOUR 

router.get('/',       anyLoggedIn,                          getProducts);
router.get('/:id',    anyLoggedIn,                          getProductById);
router.post('/',      adminOnly,   upload.single('image'),  createProduct);
router.put('/:id',    adminOnly,   upload.single('image'),  updateProduct);
router.delete('/:id', adminOnly,                            deleteProduct);

module.exports = router;