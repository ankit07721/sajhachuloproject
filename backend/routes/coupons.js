const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const Coupon = require('../models/Coupon');


const router = express.Router();

//validate the coupon for the user
router.post('/validate', authenticateToken, [
    body('couponCode', 'Coupon code is required').notEmpty(),
    body('orderTotal', 'Order total is required').isFloat({ min: 0 }),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { couponCode, orderTotal } = req.body;

    try {
        const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });

        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Invalid coupon code.' });
        }
        if (coupon.expiresAt < new Date()) {
            return res.status(400).json({ success: false, message: 'This coupon has expired.' });
        }
        if (orderTotal < coupon.minOrderAmount) {
            return res.status(400).json({ success: false, message: `A minimum order of NRs ${coupon.minOrderAmount} is required to use this coupon.` });
        }

        let discount = 0;
        if (coupon.discountType === 'percentage') {
            discount = (orderTotal * coupon.discountValue) / 100;
        } else { // 'fixed'
            discount = coupon.discountValue;
        }

        res.json({ success: true, data: { discount, message: 'Coupon applied successfully!' } });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// Admin routes for CRUD operations
router.use(authenticateToken, authorizeRole('admin'));

//Create a new coupon
router.post('/', [
    body('code', 'Coupon code is required').notEmpty().trim().toUpperCase(),
    body('discountType', 'Discount type must be either "percentage" or "fixed"').isIn(['percentage', 'fixed']),
    body('discountValue', 'Discount value is required and must be a positive number').isFloat({ min: 0 }),
    body('expiresAt', 'A valid expiration date is required').isISO8601().toDate(),
    body('minOrderAmount', 'Minimum order amount must be a positive number').optional().isFloat({ min: 0 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
        const { code, discountType, discountValue, expiresAt, minOrderAmount } = req.body;

        const existingCoupon = await Coupon.findOne({ code });
        if (existingCoupon) {
            return res.status(400).json({ success: false, message: 'A coupon with this code already exists.' });
        }

        const newCoupon = new Coupon({ code, discountType, discountValue, expiresAt, minOrderAmount });
        await newCoupon.save();

        res.status(201).json({ success: true, data: newCoupon });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// get all coupons (for ADMIN)
router.get('/', async (req, res) => {
    try {
        const coupons = await Coupon.find().sort({ createdAt: -1 });
        res.json({ success: true, data: coupons });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// Toggle a coupon's active status
router.put('/:id/toggle-status', async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);
        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }

        coupon.isActive = !coupon.isActive;
        await coupon.save();

        res.json({ success: true, message: `Coupon status updated to ${coupon.isActive ? 'active' : 'inactive'}.`, data: coupon });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// deleta a coupon
router.delete('/:id', async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);
        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }

        await Coupon.findByIdAndDelete(req.params.id);

        res.json({ success: true, message: 'Coupon deleted successfully.' });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

module.exports = router;