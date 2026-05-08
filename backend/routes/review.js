// backend/routes/review.js
const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const Review = require("../models/Review");
const Order = require("../models/Order");
const MenuItem = require("../models/MenuItem");

router.get("/reviewable", authenticateToken, async (req, res) => {
  try {
    // Get all delivered orders by this user
    const deliveredOrders = await Order.find({
      customer: req.user._id,
      status:   "delivered",
    }).populate("items.menuItem", "name image price");
 
    // Get all reviews already submitted by this user
    const existingReviews = await Review.find({ user: req.user._id });
    const reviewedKeys = new Set(
      existingReviews.map((r) => `${r.menuItem}_${r.order}`)
    );
 
    // Build list of reviewable items
    const reviewable = [];
    deliveredOrders.forEach((order) => {
      order.items.forEach((item) => {
        const key = `${item.menuItem?._id}_${order._id}`;
        if (!reviewedKeys.has(key) && item.menuItem) {
          reviewable.push({
            orderId:       order._id,
            orderNumber:   order.orderNumber,
            orderDate:     order.createdAt,
            menuItemId:    item.menuItem._id,
            menuItemName:  item.menuItem.name,
            menuItemImage: item.menuItem.image,
            menuItemPrice: item.price,
          });
        }
      });
    });
 
    res.json({ success: true, data: reviewable, count: reviewable.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
 
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reviews/my
// Returns all reviews submitted by the current user
// ─────────────────────────────────────────────────────────────────────────────
router.get("/my", authenticateToken, async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.user._id })
      .populate("menuItem", "name image")
      .populate("order",    "orderNumber createdAt")
      .sort({ createdAt: -1 });
 
    res.json({ success: true, data: reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
 
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reviews/item/:menuItemId
// Returns all reviews for a specific menu item (public)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/item/:menuItemId", async (req, res) => {
  try {
    const reviews = await Review.find({ menuItem: req.params.menuItemId })
      .populate("user", "firstName lastName")
      .sort({ createdAt: -1 })
      .limit(20);
 
    // Calculate stats
    const total  = reviews.length;
    const avgRating = total > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / total
      : 0;
 
    // Rating distribution: { 5: 10, 4: 5, 3: 2, 2: 1, 1: 0 }
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => { distribution[r.rating] = (distribution[r.rating] || 0) + 1; });
 
    res.json({
      success: true,
      data: reviews,
      stats: {
        total,
        average: Math.round(avgRating * 10) / 10,
        distribution,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
 
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/reviews
// Submit a review — with full QA validation
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { menuItemId, orderId, rating, comment } = req.body;
 
    // ── Validation 1: Required fields ─────────────────────────────────────
    if (!menuItemId || !orderId || !rating) {
      return res.status(400).json({
        success: false,
        message: "menuItemId, orderId and rating are required",
      });
    }
 
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }
 
    // ── Validation 2: Order must exist and belong to this user ────────────
    const order = await Order.findOne({
      _id:      orderId,
      customer: req.user._id,
    });
 
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or does not belong to you",
      });
    }
 
    // ── Validation 3: Order must be DELIVERED ─────────────────────────────
    if (order.status !== "delivered") {
      return res.status(400).json({
        success: false,
        message: `You can only review delivered orders. This order is: ${order.status}`,
      });
    }
 
    // ── Validation 4: Item must be in the order ───────────────────────────
    const itemInOrder = order.items.some(
      (i) => i.menuItem?.toString() === menuItemId
    );
    if (!itemInOrder) {
      return res.status(400).json({
        success: false,
        message: "This item was not part of the specified order",
      });
    }
 
    // ── Validation 5: Duplicate check ────────────────────────────────────
    const existing = await Review.findOne({
      user:     req.user._id,
      menuItem: menuItemId,
      order:    orderId,
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this item from this order",
      });
    }
 
    // ── Save review ───────────────────────────────────────────────────────
    // Note: Review model's post-save hook auto-updates Bayesian rating
    const review = new Review({
      user:     req.user._id,
      menuItem: menuItemId,
      order:    orderId,
      rating:   Number(rating),
      comment:  comment?.trim() || "",
    });
    await review.save();
    // ↑ This triggers Review.calculateAverageRating() via post-save hook
    // which updates: MenuItem.rating.average + bayesianScore + Chef rating
 
    const populated = await review.populate([
      { path: "user",     select: "firstName lastName" },
      { path: "menuItem", select: "name image" },
    ]);
 
    console.log(`[REVIEW] ${req.user.firstName} rated "${populated.menuItem?.name}" → ${rating}★`);
 
    res.status(201).json({
      success: true,
      message: "Review submitted! Thank you for your feedback.",
      data:    populated,
    });
  } catch (err) {
    // Handle duplicate key error from MongoDB unique index
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this item from this order",
      });
    }
    console.error("[REVIEW ERROR]", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
 
// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/reviews/:id
// User can delete their own review
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const review = await Review.findOne({
      _id:  req.params.id,
      user: req.user._id,
    });
 
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }
 
    await review.deleteOne();
    // post-remove hook in Review model recalculates rating automatically
 
    res.json({ success: true, message: "Review deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
 
module.exports = router;