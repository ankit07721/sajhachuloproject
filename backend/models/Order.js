// backend/models/Order.js
const mongoose = require('mongoose');

const generateOrderNumber = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `PLT${dateStr}${randomStr}`;
};

// ── Haversine Distance Algorithm ──────────────────────────────────────────────
// Calculates real-world distance between two GPS coordinates (in km)
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      default: generateOrderNumber,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // ── Chef Assignment ────────────────────────────────────────────────────────
    // Primary chef (from first item's createdBy)
    assignedChef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Per-item chef tracking
    chefItems: [
      {
        chef: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        itemName: String,
        status: {
          type: String,
          enum: ['pending', 'preparing', 'ready'],
          default: 'pending',
        },
      },
    ],

    customerInfo: {
      firstName: { type: String, required: true },
      lastName:  { type: String, required: true },
      email:     { type: String, required: true },
      phone:     { type: String, required: true },
      address:   { type: String, required: true },
      coordinates: {
        latitude:  Number,
        longitude: Number,
      },
    },

    items: [
      {
        menuItem:  { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
        name:      { type: String, required: true },
        price:     { type: Number, required: true },
        quantity:  { type: Number, required: true, min: 1 },
        subtotal:  { type: Number, required: true },
        chef:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        chefName:  { type: String, default: null },
        specialInstructions: { type: String, maxlength: 500 },
      },
    ],

    orderType: {
      type: String,
      enum: ['delivery', 'pickup'],
      default: 'delivery',
    },
    scheduledFor: {
      date: { type: Date, required: true },
      time: { type: String, required: true },
    },
    specialInstructions: { type: String, maxlength: 1000 },
    referralCode: String,
    paymentMethod: {
      type: String,
      enum: ['esewa', 'khalti', 'cod'],
      default: 'cod',
    },
    pricing: {
      subtotal:    { type: Number, required: true },
      tax:         { type: Number, default: 0 },
      deliveryFee: { type: Number, default: 0 },
      discount:    { type: Number, default: 0 },
      total:       { type: Number, required: true },
    },

    // ── Status Machine ─────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['pending','confirmed','preparing','ready','out-for-delivery','delivered','cancelled'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['pending','paid','failed','refunded'],
      default: 'pending',
    },

    // ── Haversine Delivery Calculation ────────────────────────────────────────
    deliveryDistance: { type: Number, default: null }, // km
    estimatedDeliveryTime: Date,
    actualDeliveryTime: Date,

    // ── Tracking Timeline ─────────────────────────────────────────────────────
    trackingInfo: {
      orderPlaced:     { timestamp: { type: Date, default: Date.now }, status: { type: String, default: 'Order placed successfully' } },
      confirmed:       { timestamp: Date, status: String },
      preparing:       { timestamp: Date, status: String },
      ready:           { timestamp: Date, status: String },
      outForDelivery:  { timestamp: Date, status: String },
      delivered:       { timestamp: Date, status: String },
      cancelled:       { timestamp: Date, status: String },
    },

    deliveryAddress: {
      street: String, city: String, state: String, zipCode: String,
      landmark: String, deliveryInstructions: String,
      coordinates: {
        latitude:  { type: Number, min: -90,  max: 90  },
        longitude: { type: Number, min: -180, max: 180 },
      },
    },
    deliveryInfo: {
      distance: { type: Number, min: 0 },
      zone: String,
      canDeliver: { type: Boolean, default: true },
      originalDeliveryFee: Number,
      deliveryDiscount: { type: Number, default: 0 },
    },
    rating: {
      score:    { type: Number, min: 1, max: 5 },
      feedback: String,
      ratedAt:  Date,
    },
    cancelReason: String,
    refundAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Indexes
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ assignedChef: 1, status: 1 });

// ── Haversine-based Delivery Time Estimator ───────────────────────────────────
// Kitchen location: Thamel, Kathmandu (default)
const KITCHEN_LAT = 27.7172;
const KITCHEN_LON = 85.3240;
const AVG_SPEED_KMH = 20; // delivery speed in city traffic

orderSchema.methods.calculateEstimatedDeliveryTime = function () {
  const now = new Date();

  // Use Haversine if customer coords available
  if (this.customerInfo?.coordinates?.latitude) {
    const distanceKm = haversineDistance(
      KITCHEN_LAT, KITCHEN_LON,
      this.customerInfo.coordinates.latitude,
      this.customerInfo.coordinates.longitude
    );
    this.deliveryDistance = Math.round(distanceKm * 10) / 10;

    // Travel time (mins) + 20 min prep time
    const travelMins = Math.ceil((distanceKm / AVG_SPEED_KMH) * 60);
    const totalMins = 20 + travelMins;
    this.estimatedDeliveryTime = new Date(now.getTime() + totalMins * 60000);
  } else {
    // Default: 30 mins
    this.estimatedDeliveryTime = new Date(now.getTime() + 30 * 60000);
  }

  return this.estimatedDeliveryTime;
};

// ── FSM Status Updater ────────────────────────────────────────────────────────
const STATUS_MESSAGES = {
  confirmed:        'Order confirmed! Kitchen is getting ready.',
  preparing:        'Chef is preparing your food 👨‍🍳',
  ready:            'Food is ready! Waiting for delivery pickup 🍱',
  'out-for-delivery': 'Your order is on the way! 🛵',
  delivered:        'Order delivered! Enjoy your meal 🎉',
  cancelled:        'Order has been cancelled.',
};

orderSchema.methods.updateStatus = function (newStatus, customMessage) {
  this.status = newStatus;
  const timestamp = new Date();
  const message = customMessage || STATUS_MESSAGES[newStatus] || `Order ${newStatus}`;

  // Map status to trackingInfo key
  const keyMap = {
    confirmed:          'confirmed',
    preparing:          'preparing',
    ready:              'ready',
    'out-for-delivery': 'outForDelivery',
    delivered:          'delivered',
    cancelled:          'cancelled',
  };

  const key = keyMap[newStatus];
  if (key && this.trackingInfo[key] !== undefined) {
    this.trackingInfo[key] = { timestamp, status: message };
  }

  if (newStatus === 'delivered') this.actualDeliveryTime = timestamp;

  return this.save();
};

orderSchema.methods.canBeCancelled = function () {
  return ['pending', 'confirmed'].includes(this.status);
};

orderSchema.statics.getTodaysOrders = function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return this.find({ createdAt: { $gte: today, $lt: tomorrow } })
    .populate('customer', 'firstName lastName email phone')
    .populate('items.menuItem', 'name category')
    .populate('assignedChef', 'firstName lastName');
};

// Export haversine for use in routes
orderSchema.statics.haversineDistance = haversineDistance;
orderSchema.statics.KITCHEN_LAT = KITCHEN_LAT;
orderSchema.statics.KITCHEN_LON = KITCHEN_LON;

module.exports = mongoose.model('Order', orderSchema);