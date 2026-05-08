// backend/routes/orders.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');
const Coupon = require('../models/Coupon');
const Cart = require('../models/Cart');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail } = require('../utils/email');
const LocationService = require('../services/locationService');
const mongoose = require('mongoose');

const router = express.Router();

// ── Validation ─────────────────────────────────────────────────────────────────
const validateOrder = [
  body('customerInfo.firstName').notEmpty().trim(),
  body('customerInfo.lastName').notEmpty().trim(),
  body('customerInfo.email').isEmail().normalizeEmail(),
  body('customerInfo.phone').matches(/^[0-9]{10}$/),
  body('customerInfo.address').notEmpty().trim(),
  body('items').isArray({ min: 1 }),
  body('items.*.menuItem').isMongoId(),
  body('items.*.quantity').isInt({ min: 1, max: 20 }),
  body('scheduledFor.date').isISO8601(),
  body('scheduledFor.time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
];

// ── AUTO-ASSIGN CHEF from menu items ──────────────────────────────────────────
// Finds which chef created each item and assigns them to the order
const autoAssignChef = async (orderItems) => {
  const chefMap = {};

  for (const item of orderItems) {
    const menuItem = await MenuItem.findById(item.menuItem).populate('createdBy', 'firstName lastName role');
    if (menuItem?.createdBy && menuItem.createdBy.role === 'chef') {
      const chefId = menuItem.createdBy._id.toString();
      if (!chefMap[chefId]) {
        chefMap[chefId] = {
          chef: menuItem.createdBy._id,
          chefName: `${menuItem.createdBy.firstName} ${menuItem.createdBy.lastName}`,
          items: [],
        };
      }
      chefMap[chefId].items.push(item.name);
    }
  }

  const chefs = Object.values(chefMap);
  // Primary chef = chef with most items in this order
  const primaryChef = chefs.sort((a, b) => b.items.length - a.items.length)[0];
  return { primaryChef, allChefs: chefs };
};

// ── POST /api/orders - Create new order ───────────────────────────────────────
router.post('/', authenticateToken, validateOrder, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { customerInfo, items, scheduledFor, specialInstructions, referralCode, couponCode, paymentMethod } = req.body;
    const customer = req.user;

    // ── Build order items + calculate subtotal ──────────────────────────────
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItem)
        .populate('createdBy', 'firstName lastName role');

      if (!menuItem || !menuItem.isAvailable) {
        return res.status(400).json({ success: false, message: `Item is not available.` });
      }

       //  Prevent chef from ordering their own dish
      if (
        menuItem.createdBy &&
        menuItem.createdBy._id.toString() === req.user._id.toString()
      ) {
        return res.status(400).json({
          success: false,
          message: "You cannot order your own dishes!"
        });
      }

      const currentPrice = menuItem.getCurrentPrice ? menuItem.getCurrentPrice() : menuItem.price;
      const itemSubtotal = currentPrice * item.quantity;
      subtotal += itemSubtotal;

      // Store chef info per item
      const isChef = menuItem.createdBy?.role === 'chef';
      orderItems.push({
        menuItem: menuItem._id,
        name: menuItem.name,
        price: currentPrice,
        quantity: item.quantity,
        subtotal: itemSubtotal,
        chef: isChef ? menuItem.createdBy._id : null,
        chefName: isChef ? `${menuItem.createdBy.firstName} ${menuItem.createdBy.lastName}` : null,
      });
    }

    // ── Auto-assign chef ───────────────────────────────────────────────────
    const { primaryChef, allChefs } = await autoAssignChef(orderItems);

    // ── Delivery fee with Haversine ────────────────────────────────────────
    let deliveryFee = 50;
    let deliveryDistance = null;

    if (customerInfo.coordinates?.latitude) {
      const distKm = Order.haversineDistance(
        Order.KITCHEN_LAT, Order.KITCHEN_LON,
        customerInfo.coordinates.latitude,
        customerInfo.coordinates.longitude
      );
      deliveryDistance = Math.round(distKm * 10) / 10;

      // Fee tiers based on distance
      if (distKm <= 2)       deliveryFee = 30;
      else if (distKm <= 5)  deliveryFee = 60;
      else if (distKm <= 10) deliveryFee = 100;
      else                   deliveryFee = 150;
    } else {
      // Fallback to LocationService
      try {
        const deliveryInfo = LocationService.getDeliveryInfo(0, 0, subtotal);
        if (deliveryInfo.success) deliveryFee = deliveryInfo.fee;
      } catch (e) {}
    }

    // ── Coupon discount ────────────────────────────────────────────────────
    let discount = 0;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
      if (coupon && coupon.expiresAt >= new Date() && subtotal >= coupon.minOrderAmount) {
        discount = coupon.discountType === 'percentage'
          ? (subtotal * coupon.discountValue) / 100
          : coupon.discountValue;
      }
    }

    const tax = (subtotal - discount) * 0.13;
    const total = subtotal - discount + tax + deliveryFee;

    // ── Create order ───────────────────────────────────────────────────────
    const order = new Order({
      customer: customer._id,
      customerInfo,
      items: orderItems,
      scheduledFor,
      specialInstructions,
      referralCode,
      paymentMethod,
      pricing: { subtotal, tax, deliveryFee, discount, total },
      deliveryDistance,
      // Chef assignment
      assignedChef: primaryChef?.chef || null,
      chefItems: allChefs.map(c => ({
        chef: c.chef,
        itemName: c.items.join(', '),
        status: 'pending',
      })),
    });

    order.calculateEstimatedDeliveryTime();
    const savedOrder = await order.save();

    // Update chef's total orders count
    if (primaryChef?.chef) {
      await User.findByIdAndUpdate(primaryChef.chef, {
        $inc: { 'chefProfile.totalOrders': 1 }
      });
      console.log(`[CHEF ORDERS] Updated totalOrders for chef ${primaryChef.chefName}`);
    }

    // Clear cart
    const userCart = await Cart.findOne({ user: customer._id });
    if (userCart) { userCart.items = []; await userCart.save(); }

    // Send confirmation email
    try { await sendOrderConfirmationEmail(customer.email, savedOrder); } catch (e) {}

    // Populate chef name for response
    await savedOrder.populate('assignedChef', 'firstName lastName');

    console.log(`[ORDER CREATED] ${savedOrder.orderNumber} | Chef: ${primaryChef?.chefName || 'Admin'} | Distance: ${deliveryDistance}km`);

    res.status(201).json({ success: true, message: 'Order placed successfully!', data: savedOrder });

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
});

// ── GET /api/orders/my-orders - Customer's own orders ─────────────────────────
router.get('/my-orders', authenticateToken, async (req, res) => {
  try {
    const orders = await Order.find({ customer: new mongoose.Types.ObjectId(req.user.id) })
      .populate('items.menuItem', 'name category image')
      .populate('assignedChef', 'firstName lastName chefProfile')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: { orders } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
});

// ── GET /api/orders/chef-orders - Chef sees only THEIR orders ─────────────────
router.get('/chef-orders', authenticateToken, authorizeRole('chef'), async (req, res) => {
  try {
    // Chef sees orders where any item was created by them
    const orders = await Order.find({
      'items.chef': new mongoose.Types.ObjectId(req.user.id),
      status: { $nin: ['cancelled'] },
    })
      .populate('customer', 'firstName lastName phone')
      .populate('items.menuItem', 'name image')
      .sort({ createdAt: -1 });

    // Filter items to show only THIS chef's items
    const filteredOrders = orders.map(order => ({
      ...order.toObject(),
      myItems: order.items.filter(item =>
        item.chef && item.chef.toString() === req.user.id
      ),
    }));

    res.json({ success: true, data: filteredOrders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch chef orders' });
  }
});

// ── PATCH /api/orders/:orderNumber/chef-status - Chef updates cooking status ──
router.patch('/:orderNumber/chef-status', authenticateToken, authorizeRole('chef'), async (req, res) => {
  try {
    const { status } = req.body; // 'preparing' or 'ready'
    const validChefStatuses = ['preparing', 'ready'];

    if (!validChefStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Chef can only set: preparing or ready' });
    }

    const order = await Order.findOne({ orderNumber: req.params.orderNumber });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Verify this chef has items in this order
    const hasItems = order.items.some(item => item.chef?.toString() === req.user.id);
    if (!hasItems) return res.status(403).json({ success: false, message: 'You have no items in this order' });

    await order.updateStatus(status);

    // Notify customer via email
    const customer = await User.findById(order.customer);
    if (customer?.email) {
      try { await sendOrderStatusUpdateEmail(customer.email, order, status); } catch (e) {}
    }

    res.json({ success: true, message: `Order marked as ${status}!`, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
});

// ── GET /api/orders/:orderNumber - Get single order ───────────────────────────
router.get('/:orderNumber', authenticateToken, async (req, res) => {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber })
      .populate('items.menuItem', 'name category image')
      .populate('customer', 'firstName lastName email phone')
      .populate('assignedChef', 'firstName lastName chefProfile');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const isOwner = order.customer._id.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    const isAssignedChef = order.items.some(item => item.chef?.toString() === req.user.id);

    if (!isOwner && !isAdmin && !isAssignedChef) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch order' });
  }
});

// ── PATCH /api/orders/:orderNumber/status - Admin updates status ──────────────
router.patch('/:orderNumber/status', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { status, statusMessage } = req.body;
    const validStatuses = ['pending','confirmed','preparing','ready','out-for-delivery','delivered','cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const order = await Order.findOne({ orderNumber: req.params.orderNumber });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    await order.updateStatus(status, statusMessage);

    const customer = await User.findById(order.customer);
    if (customer?.email) {
      try { await sendOrderStatusUpdateEmail(customer.email, order, status); } catch (e) {}
    }

    res.json({ success: true, message: 'Order status updated!', data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
});

// ── PATCH /api/orders/:orderNumber/cancel - Customer cancels ──────────────────
router.patch('/:orderNumber/cancel', authenticateToken, async (req, res) => {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber, customer: req.user.id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (!order.canBeCancelled()) return res.status(400).json({ success: false, message: 'Order cannot be cancelled at this stage' });

    order.status = 'cancelled';
    order.cancelReason = req.body.reason || 'Cancelled by customer';
    await order.save();

    res.json({ success: true, message: 'Order cancelled', data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to cancel order' });
  }
});

module.exports = router;