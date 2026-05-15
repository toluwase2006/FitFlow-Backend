const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const checkRole = require('../middleware/checkRole.middleware');
const {
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct
} = require('../controllers/product.controller');

const adminOnly  = [auth, checkRole('admin')];
const anyLoggedIn = [auth]; // trainers, trainees, and admins can browse

router.get('/',      anyLoggedIn, getProducts);
router.get('/:id',   anyLoggedIn, getProductById);
router.post('/',     adminOnly,   createProduct);
router.put('/:id',   adminOnly,   updateProduct);
router.delete('/:id', adminOnly,  deleteProduct);

module.exports = router;
