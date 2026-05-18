const Product = require('../models/product.model');
const Notification = require('../models/notification.model');
const User = require('../models/user.model');
const { cloudinary } = require('../config/cloudinary');

const formatNaira = (amount) => `₦${Number(amount).toLocaleString('en-NG')}`;

// POST /api/products   (admin only)
const createProduct = async (req, res) => {
    try {
        const { name, description, price, targetAudience, category, stock } = req.body;

        if (!name || price === undefined || !targetAudience) {
            return res.status(400).json({ message: 'name, price, and targetAudience are required' });
        }

        // Use uploaded image URL or fall back to placeholder
        const imageUrl = req.file?.path
            ?? 'https://placehold.co/400x300/1a1a2e/e0e0e0?text=Product+Image';

        const product = await Product.create({
            name,
            description,
            price,
            imageUrl,
            targetAudience,
            category,
            stock,
            createdBy: req.user.id
        });

        const roleFilter =
            targetAudience === 'both'
                ? { role: { $in: ['trainer', 'trainee'] }, isActive: true }
                : { role: targetAudience, isActive: true };

        const recipients = await User.find(roleFilter).select('_id');

        if (recipients.length > 0) {
            const notifications = recipients.map((u) => ({
                userId: u._id,
                type: 'product',
                title: '🛒 New Product Available!',
                body: `"${name}" is now in the shop for ${formatNaira(price)}. Check it out!`,
                relatedId: product._id
            }));
            await Notification.insertMany(notifications);
        }

        res.status(201).json({ message: 'Product created successfully', product });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// PUT /api/products/:id   (admin only)
const updateProduct = async (req, res) => {
    try {
        const allowedFields = ['name', 'description', 'price', 'targetAudience', 'category', 'stock', 'isActive'];
        const updates = {};
        allowedFields.forEach((f) => {
            if (req.body[f] !== undefined) updates[f] = req.body[f];
        });

        // If a new image was uploaded, replace it
        if (req.file?.path) {
            // Delete old image from Cloudinary if it's not the placeholder
            const existing = await Product.findById(req.params.id).select('imageUrl');
            if (existing?.imageUrl && existing.imageUrl.includes('cloudinary')) {
                const publicId = existing.imageUrl.split('/').pop().split('.')[0];
                await cloudinary.uploader.destroy(`fitflow/products/${publicId}`);
            }
            updates.imageUrl = req.file.path;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: 'No valid fields provided to update' });
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.status(200).json({ message: 'Product updated', product });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// DELETE /api/products/:id   (admin only)
const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Clean up image from Cloudinary
        if (product.imageUrl?.includes('cloudinary')) {
            const publicId = product.imageUrl.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(`fitflow/products/${publicId}`);
        }

        res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// GET handlers unchanged
const getProducts = async (req, res) => {
    try {
        const userRole = req.user.role;
        const filter = { isActive: true };
        if (userRole !== 'admin') {
            filter.targetAudience = { $in: [userRole, 'both'] };
        }
        const products = await Product.find(filter)
            .populate('createdBy', 'firstName lastName')
            .sort({ createdAt: -1 });

        const formatted = products.map((p) => ({
            ...p.toObject(),
            formattedPrice: formatNaira(p.price)
        }));

        res.status(200).json({ products: formatted });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('createdBy', 'firstName lastName');

        if (!product) return res.status(404).json({ message: 'Product not found' });

        res.status(200).json({
            product: { ...product.toObject(), formattedPrice: formatNaira(product.price) }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = { createProduct, getProducts, getProductById, updateProduct, deleteProduct };