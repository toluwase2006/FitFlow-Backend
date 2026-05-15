const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const {
    getCart,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearCart,
    checkout
} = require('../controllers/cart.controller');

// All cart routes require authentication
router.use(auth);

router.get('/',                     getCart);
router.post('/add',                 addToCart);
router.patch('/item/:productId',    updateCartItem);
router.delete('/item/:productId',   removeCartItem);
router.delete('/',                  clearCart);
router.post('/checkout',            checkout);

module.exports = router;
