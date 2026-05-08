const express = require('express');
const Cart = require('../models/Cart.js');
const { authenticateToken } = require('../middleware/auth.js');
const MenuItem = require('../models/MenuItem.js');
const router = express.Router();

// GET user's cart and create one if it doesn't exist
router.get('/', authenticateToken, async (req, res) => {
    try {
        let cart = await Cart.findOne({ user: req.user._id }).populate('items.menuItem', 'name image price');

        if (!cart) {
            console.log(`No cart found for user ${req.user.id}. Creating a new one.`);
            cart = new Cart({ user: req.user._id, items: [] });
            await cart.save();
        }

        res.json({ success: true, data: cart });

    } catch (error) {
        console.error('Error fetching or creating cart:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// POST add,update or remove am item from cart
router.post('/', authenticateToken, async (req, res) => {
    const { menuItemId, quantity } = req.body;

    if (quantity < 0) {
        return res.status(400).json({ success: false, message: "Quantity cannot be negative." });
    }

    try {
        const menuItem = await MenuItem.findById(menuItemId);
        if (!menuItem || !menuItem.isAvailable) {
            return res.status(404).json({ success: false, message: 'Menu item not found or unavailable' });
        }

        let cart = await Cart.findOne({ user: req.user._id });
        if (!cart) {
            cart = new Cart({ user: req.user._id, items: [] });
        }

        const itemIndex = cart.items.findIndex(p => p.menuItem.toString() === menuItemId);

        if (itemIndex > -1) {
            // Item exists in cart
            if (quantity === 0) {
                // Remove item if quantity is 0
                cart.items.splice(itemIndex, 1);
            } else {
                // Update quantity
                cart.items[itemIndex].quantity = quantity;
            }
        } else if (quantity > 0) {
            // Add new item to cart
            cart.items.push({ menuItem: menuItemId, quantity, price: menuItem.getCurrentPrice() });
        }

        await cart.save();
        const populatedCart = await cart.populate('items.menuItem', 'name image price');

        res.status(200).json({ success: true, message: 'Cart updated successfully', data: populatedCart });

    } catch (error) {
        console.error('Error updating cart:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// clear all items from user's cart
router.delete('/', authenticateToken, async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id });
        if (cart) {
            cart.items = [];
            await cart.save();
        }
        res.json({ success: true, message: 'Cart cleared successfully' });
    } catch (error) {
        console.error('Error clearing cart:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});


module.exports = router;