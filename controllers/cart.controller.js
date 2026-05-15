const Cart = require('../models/cart.model');
const Product = require('../models/product.model');

// Helper: format price as Naira string
const formatNaira = (amount) => `₦${Number(amount).toLocaleString('en-NG')}`;

// Helper: build an enriched cart response with line totals and grand total
const buildCartResponse = async (cart) => {
    await cart.populate('items.productId');

    let grandTotal = 0;
    const items = cart.items.map((item) => {
        const product = item.productId; // populated
        const lineTotal = item.priceAtAdd * item.quantity;
        grandTotal += lineTotal;

        return {
            product: product
                ? {
                      _id: product._id,
                      name: product.name,
                      imageUrl: product.imageUrl,
                      price: product.price,
                      formattedPrice: formatNaira(product.price),
                      category: product.category
                  }
                : null,
            quantity: item.quantity,
            priceAtAdd: item.priceAtAdd,
            formattedPriceAtAdd: formatNaira(item.priceAtAdd),
            lineTotal,
            formattedLineTotal: formatNaira(lineTotal)
        };
    });

    return {
        _id: cart._id,
        userId: cart.userId,
        items,
        grandTotal,
        formattedGrandTotal: formatNaira(grandTotal),
        itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
        updatedAt: cart.updatedAt
    };
};

// GET /api/cart
const getCart = async (req, res) => {
    try {
        let cart = await Cart.findOne({ userId: req.user.id });

        if (!cart) {
            // Return empty cart shape — no error
            return res.status(200).json({
                cart: {
                    items: [],
                    grandTotal: 0,
                    formattedGrandTotal: formatNaira(0),
                    itemCount: 0
                }
            });
        }

        const cartData = await buildCartResponse(cart);
        res.status(200).json({ cart: cartData });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// POST /api/cart/add
// Body: { productId, quantity }
const addToCart = async (req, res) => {
    try {
        const { productId, quantity = 1 } = req.body;

        if (!productId) {
            return res.status(400).json({ message: 'productId is required' });
        }

        if (quantity < 1) {
            return res.status(400).json({ message: 'quantity must be at least 1' });
        }

        // Verify product exists and is active
        const product = await Product.findOne({ _id: productId, isActive: true });
        if (!product) {
            return res.status(404).json({ message: 'Product not found or is no longer available' });
        }

        // Verify the product is visible to this user's role
        const userRole = req.user.role;
        if (product.targetAudience !== 'both' && product.targetAudience !== userRole) {
            return res.status(403).json({ message: 'This product is not available for your account type' });
        }

        let cart = await Cart.findOne({ userId: req.user.id });

        if (!cart) {
            // Create a new cart
            cart = new Cart({
                userId: req.user.id,
                items: [{ productId, quantity, priceAtAdd: product.price }]
            });
        } else {
            const existingIndex = cart.items.findIndex(
                (i) => i.productId.toString() === productId
            );

            if (existingIndex > -1) {
                // Increase quantity
                cart.items[existingIndex].quantity += quantity;
            } else {
                // Add new line item
                cart.items.push({ productId, quantity, priceAtAdd: product.price });
            }
        }

        await cart.save();
        const cartData = await buildCartResponse(cart);

        res.status(200).json({ message: 'Item added to cart', cart: cartData });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// PATCH /api/cart/item/:productId
// Body: { quantity }
const updateCartItem = async (req, res) => {
    try {
        const { quantity } = req.body;
        const { productId } = req.params;

        if (!quantity || quantity < 1) {
            return res.status(400).json({ message: 'quantity must be at least 1' });
        }

        const cart = await Cart.findOne({ userId: req.user.id });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        const item = cart.items.find((i) => i.productId.toString() === productId);
        if (!item) {
            return res.status(404).json({ message: 'Item not found in cart' });
        }

        item.quantity = quantity;
        await cart.save();

        const cartData = await buildCartResponse(cart);
        res.status(200).json({ message: 'Cart updated', cart: cartData });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// DELETE /api/cart/item/:productId
const removeCartItem = async (req, res) => {
    try {
        const { productId } = req.params;

        const cart = await Cart.findOne({ userId: req.user.id });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        const initialLen = cart.items.length;
        cart.items = cart.items.filter((i) => i.productId.toString() !== productId);

        if (cart.items.length === initialLen) {
            return res.status(404).json({ message: 'Item not found in cart' });
        }

        await cart.save();
        const cartData = await buildCartResponse(cart);
        res.status(200).json({ message: 'Item removed', cart: cartData });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// DELETE /api/cart
const clearCart = async (req, res) => {
    try {
        await Cart.findOneAndDelete({ userId: req.user.id });
        res.status(200).json({ message: 'Cart cleared successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// POST /api/cart/checkout
// Summarises the order, clears the cart, and returns a receipt in Naira
const checkout = async (req, res) => {
    try {
        const cart = await Cart.findOne({ userId: req.user.id });

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: 'Your cart is empty' });
        }

        // Build receipt before deleting
        const cartData = await buildCartResponse(cart);

        // In a real system you would create an Order document and integrate a payment
        // gateway (e.g. Paystack for Nigeria). For now we return the full summary.
        const orderSummary = {
            orderId: `FF-${Date.now()}`,
            userId: req.user.id,
            items: cartData.items,
            grandTotal: cartData.grandTotal,
            formattedGrandTotal: cartData.formattedGrandTotal,
            itemCount: cartData.itemCount,
            currency: 'NGN',
            currencySymbol: '₦',
            status: 'pending_payment',
            message: 'Proceed to payment gateway with your order total.',
            checkoutAt: new Date().toISOString()
        };

        // Clear the cart after building the summary
        await Cart.findOneAndDelete({ userId: req.user.id });

        res.status(200).json({
            message: 'Checkout successful. Proceed to payment.',
            order: orderSummary
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    getCart,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearCart,
    checkout
};
