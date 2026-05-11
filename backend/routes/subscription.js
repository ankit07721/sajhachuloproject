// backend/routes/subscription.js
const express = require("express");
const router = express.Router();
const Subscription = require("../models/Subscription");
const TiffinPlan = require("../models/TiffinPlan");
const User = require("../models/User");
const LocationService = require("../services/locationService");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

// ── Haversine Chef Assignment ─────────────────────────────────────────────────
const assignNearestChef = async (deliveryCoords) => {
  try {
    if (!deliveryCoords?.latitude || !deliveryCoords?.longitude) return null;

    const chefs = await User.find({
      role: "chef",
      "chefProfile.applicationStatus": "approved",
      "chefProfile.isAvailable": true,
      "location.latitude": { $exists: true },
      "location.longitude": { $exists: true },
    });

    if (chefs.length === 0) return null;

    let nearestChef = null;
    let minDistance = Infinity;

    chefs.forEach((chef) => {
      const dist = LocationService.calculateHaversineDistance(
        chef.location.latitude,
        chef.location.longitude,
        deliveryCoords.latitude,
        deliveryCoords.longitude,
      );
      console.log(`[TIFFIN] Chef ${chef.firstName}: ${dist.toFixed(1)}km away`);
      if (dist < minDistance && dist <= 7) {
        minDistance = dist;
        nearestChef = chef;
      }
    });

    if (nearestChef) {
      console.log(
        `[TIFFIN] ✅ Assigned: ${nearestChef.firstName} (${minDistance.toFixed(1)}km)`,
      );
    } else {
      console.log(`[TIFFIN] ❌ No chef within 7km`);
    }
    return nearestChef;
  } catch (err) {
    console.error("[TIFFIN ASSIGN ERROR]", err);
    return null;
  }
};

// ── Helper: run expiry check on a subscription ────────────────────────────────
const checkAndExpire = async (sub) => {
  if (!sub) return sub;
  await sub.checkExpiry();
  return sub;
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC: GET all active tiffin plans
// ─────────────────────────────────────────────────────────────────────────────
router.get("/plans", async (req, res) => {
  try {
    const plans = await TiffinPlan.find({ isActive: true }).sort({
      pricePerWeek: 1,
    });
    res.json({ success: true, data: plans });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH: GET my active subscription
// QA FIX: Run expireOverdue on every request so expiry is always up to date
// ─────────────────────────────────────────────────────────────────────────────
router.get("/my", authenticateToken, async (req, res) => {
  try {
    // ── FIX: Expire ALL overdue subs first (not just this one) ──────────
    await Subscription.expireOverdue();

    const sub = await Subscription.findOne({
      user: req.user._id,
      status: { $in: ["active", "paused", "pending_approval", "approved"] },
    })
      .populate("plan")
      .populate("assignedChef", "firstName lastName chefProfile location");

    res.json({ success: true, data: sub || null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH: GET subscription history (includes expired/cancelled)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/history", authenticateToken, async (req, res) => {
  try {
    // Expire overdue before showing history
    await Subscription.expireOverdue();

    const subs = await Subscription.find({ user: req.user._id })
      .populate("plan")
      .populate("assignedChef", "firstName lastName")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: subs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH: CREATE new subscription
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", authenticateToken, async (req, res) => {
  try {
    const {
      planId,
      preferences,
      deliveryAddress,
      paymentMethod,
      deliveryCoords,
    } = req.body;

    // Expire overdue before checking for existing
    await Subscription.expireOverdue();

    // Block duplicate active or pending subscription
    // QA FIX: Only block if status is active or approved.
    // If pending_approval and unpaid, allow them to overwrite or create new (it might be a failed attempt)
    const existing = await Subscription.findOne({
      user: req.user._id,
      status: { $in: ["active", "approved"] },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message:
          "You already have an active subscription. Please manage it in your dashboard.",
      });
    }

    // If there's an existing pending_approval one, delete it to allow a fresh start
    await Subscription.deleteMany({
      user: req.user._id,
      status: "pending_approval",
    });

    const plan = await TiffinPlan.findById(planId);
    if (!plan)
      return res
        .status(404)
        .json({ success: false, message: "Plan not found" });

    // Handle Chef Assignment (Use user selection or fallback to nearest)
    let finalChef = null;
    const { assignedChef: selectedChefId } = req.body;

    if (selectedChefId) {
      finalChef = await User.findById(selectedChefId);
    } else {
      finalChef = await assignNearestChef(deliveryCoords);
    }

    // ── Dates (Start date only becomes real once ACTIVATED/PAID) ──────────────
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.durationDays);

    // Price
    const weeks = plan.durationDays / 7;
    const total = plan.pricePerWeek * weeks * (1 - plan.discountPercent / 100);

    const sub = await Subscription.create({
      user: req.user._id,
      plan: plan._id,
      planName: plan.name,
      planSlug: plan.slug,
      preferences: preferences || {},
      deliveryAddress: deliveryAddress || {},
      startDate,
      endDate,
      totalAmount: Math.round(total),
      status: "pending_approval",
      paymentStatus: "unpaid",
      paymentMethod: paymentMethod || "cod",
      assignedChef: finalChef?._id || null,
      assignedChefName: finalChef
        ? `${finalChef.firstName} ${finalChef.lastName}`
        : null,
    });

    const populated = await sub.populate(["plan", "assignedChef"]);
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH: PAUSE
// QA FIX: Cannot pause if already expired
// ─────────────────────────────────────────────────────────────────────────────
router.put("/:id/pause", authenticateToken, async (req, res) => {
  try {
    const sub = await Subscription.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!sub)
      return res
        .status(404)
        .json({ success: false, message: "Subscription not found" });

    await sub.checkExpiry(); // expire if overdue before checking status

    if (sub.status !== "active") {
      return res.status(400).json({
        success: false,
        message: `Cannot pause a ${sub.status} subscription`,
      });
    }

    sub.status = "paused";
    sub.pausedAt = new Date();
    await sub.save();
    res.json({ success: true, data: sub });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH: RESUME
// QA FIX: Cannot resume if expired
// ─────────────────────────────────────────────────────────────────────────────
router.put("/:id/resume", authenticateToken, async (req, res) => {
  try {
    const sub = await Subscription.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!sub)
      return res
        .status(404)
        .json({ success: false, message: "Subscription not found" });

    await sub.checkExpiry(); // expire if overdue before checking

    if (sub.status === "expired") {
      return res.status(400).json({
        success: false,
        message:
          "Cannot resume an expired subscription. Please subscribe again.",
      });
    }
    if (sub.status !== "paused") {
      return res
        .status(400)
        .json({ success: false, message: "Subscription is not paused" });
    }

    sub.status = "active";
    sub.pausedAt = undefined;
    await sub.save();
    res.json({ success: true, data: sub });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH: CANCEL
// ─────────────────────────────────────────────────────────────────────────────
router.put("/:id/cancel", authenticateToken, async (req, res) => {
  try {
    const sub = await Subscription.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!sub)
      return res
        .status(404)
        .json({ success: false, message: "Subscription not found" });
    if (sub.status === "cancelled") {
      return res
        .status(400)
        .json({ success: false, message: "Already cancelled" });
    }
    if (sub.status === "expired") {
      return res
        .status(400)
        .json({ success: false, message: "Subscription already expired" });
    }

    sub.status = "cancelled";
    sub.cancelledAt = new Date();
    sub.cancelReason = req.body.reason || "User cancelled";
    await sub.save();
    res.json({ success: true, data: sub });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: GET all subscriptions
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/admin/all",
  authenticateToken,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      await Subscription.expireOverdue(); // keep statuses accurate for admin too

      const { status, page = 1, limit = 20 } = req.query;
      const filter = status ? { status } : {};

      const subs = await Subscription.find(filter)
        .populate("user", "firstName lastName email phone")
        .populate("plan")
        .populate("assignedChef", "firstName lastName chefProfile")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

      const total = await Subscription.countDocuments(filter);
      res.json({ success: true, data: subs, total, page: Number(page) });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: SEED default plans
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/admin/seed-plans",
  authenticateToken,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      await TiffinPlan.deleteMany({});
      const plans = await TiffinPlan.insertMany([
        {
          name: "Weekly Meal Plan",
          slug: "weekly",
          badge: "Popular",
          description: "Get 7 days of curated home-cooked meals.",
          pricePerWeek: 1500,
          durationDays: 7,
          mealsPerDay: 1,
          features: [
            "7 lunches or dinners",
            "Chef selection",
            "Dietary customization",
            "Free delivery",
          ],
          discountPercent: 0,
        },
        {
          name: "Monthly Subscription",
          slug: "monthly",
          badge: "Best Value",
          description: "30 days of fresh home-cooked meals with extra savings.",
          pricePerWeek: 5000,
          durationDays: 30,
          mealsPerDay: 1,
          features: [
            "30 days of meals",
            "Priority chef access",
            "Full customization",
            "Free delivery",
            "10% savings",
          ],
          discountPercent: 10,
        },
        {
          name: "Special Diet Plan",
          slug: "special-diet",
          badge: "Health",
          description:
            "Health-focused plans for diabetic patients and health-conscious eaters.",
          pricePerWeek: 2000,
          durationDays: 7,
          mealsPerDay: 1,
          features: [
            "Nutritionist-guided menus",
            "Diabetic-friendly",
            "Soft food options",
            "Low oil & sugar",
          ],
          discountPercent: 0,
        },
      ]);
      res.json({ success: true, message: "Plans seeded!", data: plans });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// AUTH: CLAIM DAILY MEAL
// ─────────────────────────────────────────────────────────────────────────────
router.post("/claim-meal", authenticateToken, async (req, res) => {
  try {
    const Order = require("../models/Order");
    const mongoose = require("mongoose");

    // 1. Find active subscription
    const sub = await Subscription.findOne({
      user: req.user._id,
      status: "active",
      paymentStatus: "paid",
    }).populate("plan");

    if (!sub) {
      return res.status(400).json({
        success: false,
        message: "You need an active, paid subscription to claim a meal.",
      });
    }

    // 2. Check if already claimed today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const alreadyClaimed = await Order.findOne({
      customer: req.user._id,
      paymentMethod: "subscription",
      createdAt: { $gte: startOfToday, $lte: endOfToday },
      status: { $ne: "cancelled" },
    });

    if (alreadyClaimed) {
      return res.status(400).json({
        success: false,
        message: "You have already claimed your meal for today!",
      });
    }

    // 3. Create the order
    const order = new Order({
      customer: req.user._id,
      customerInfo: {
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
        phone: sub.deliveryAddress?.phone || req.user.phone,
        address: `${sub.deliveryAddress?.street}, ${sub.deliveryAddress?.city}`,
      },
      items: [
        {
          name: `${sub.planName} Daily Meal`,
          price: 0,
          quantity: 1,
          subtotal: 0,
          chef: sub.assignedChef,
          chefName: sub.assignedChefName,
        },
      ],
      pricing: {
        subtotal: 0,
        tax: 0,
        deliveryFee: 0,
        discount: 0,
        total: 0,
      },
      paymentMethod: "subscription",
      paymentStatus: "paid", // Already covered by subscription
      assignedChef: sub.assignedChef,
      status: "pending",
    });

    await order.save();

    res.json({
      success: true,
      message: "Meal claimed successfully! Your chef has been notified.",
      data: order,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: REASSIGN CHEF
// ─────────────────────────────────────────────────────────────────────────────
router.put(
  "/admin/:id/reassign-chef",
  authenticateToken,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      const { chefId } = req.body;
      const sub = await Subscription.findById(req.params.id);
      const chef = await User.findById(chefId);

      if (!sub || !chef)
        return res
          .status(404)
          .json({ success: false, message: "Subscription or Chef not found" });

      sub.assignedChef = chef._id;
      sub.assignedChefName = `${chef.firstName} ${chef.lastName}`;
      await sub.save();

      res.json({
        success: true,
        message: "Chef reassigned successfully!",
        data: sub,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// CHEF: GET PENDING REQUESTS
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/chef/requests",
  authenticateToken,
  authorizeRole("chef"),
  async (req, res) => {
    try {
      const requests = await Subscription.find({
        assignedChef: req.user.id,
        status: "pending_approval",
      }).populate("user", "firstName lastName email phone");

      res.json({ success: true, data: requests });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// CHEF: APPROVE REQUEST
// ─────────────────────────────────────────────────────────────────────────────
router.put(
  "/:id/approve",
  authenticateToken,
  authorizeRole("chef"),
  async (req, res) => {
    try {
      const sub = await Subscription.findOne({
        _id: req.params.id,
        assignedChef: req.user.id,
      });
      if (!sub)
        return res
          .status(404)
          .json({ success: false, message: "Subscription request not found" });

      sub.status = "approved";
      await sub.save();

      // Notify customer
      try {
        await Notification.create({
          recipient: sub.user,
          type: "subscription_update",
          title: "Subscription Approved! 🎉",
          message: `Your subscription for ${sub.planName} has been approved by the chef. Please complete payment to activate.`,
          link: "/my-subscription",
        });
      } catch (nErr) {}

      res.json({
        success: true,
        message: "Subscription approved! Waiting for customer payment.",
        data: sub,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
);

module.exports = router;
