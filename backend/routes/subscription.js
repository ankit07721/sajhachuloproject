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
      "location.latitude":  { $exists: true },
      "location.longitude": { $exists: true },
    });

    if (chefs.length === 0) return null;

    let nearestChef = null;
    let minDistance = Infinity;

    chefs.forEach((chef) => {
      const dist = LocationService.calculateHaversineDistance(
        chef.location.latitude, chef.location.longitude,
        deliveryCoords.latitude, deliveryCoords.longitude
      );
      console.log(`[TIFFIN] Chef ${chef.firstName}: ${dist.toFixed(1)}km away`);
      if (dist < minDistance && dist <= 7) {
        minDistance = dist;
        nearestChef = chef;
      }
    });

    if (nearestChef) {
      console.log(`[TIFFIN] ✅ Assigned: ${nearestChef.firstName} (${minDistance.toFixed(1)}km)`);
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
    const plans = await TiffinPlan.find({ isActive: true }).sort({ pricePerWeek: 1 });
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
      user:   req.user._id,
      status: { $in: ["active", "paused"] },
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
    const { planId, preferences, deliveryAddress, paymentMethod, deliveryCoords } = req.body;

    // Expire overdue before checking for existing
    await Subscription.expireOverdue();

    // Block duplicate active subscription
    const existing = await Subscription.findOne({
      user:   req.user._id,
      status: { $in: ["active", "paused"] },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "You already have an active subscription. Cancel it first.",
      });
    }

    const plan = await TiffinPlan.findById(planId);
    if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });

    // ── Dates ──────────────────────────────────────────────────────────────
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0); // start of today

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.durationDays);
    endDate.setHours(23, 59, 59, 999); // end of last day

    // Price
    const weeks = plan.durationDays / 7;
    const total = plan.pricePerWeek * weeks * (1 - plan.discountPercent / 100);

    // Haversine chef assignment
    const nearestChef = await assignNearestChef(deliveryCoords);

    const sub = await Subscription.create({
      user:             req.user._id,
      plan:             plan._id,
      planName:         plan.name,
      planSlug:         plan.slug,
      preferences:      preferences || {},
      deliveryAddress:  deliveryAddress || {},
      startDate,
      endDate,
      totalAmount:      Math.round(total),
      paymentStatus:    "pending",
      paymentMethod:    paymentMethod || "cod",
      assignedChef:     nearestChef?._id    || null,
      assignedChefName: nearestChef
        ? `${nearestChef.firstName} ${nearestChef.lastName}`
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
    const sub = await Subscription.findOne({ _id: req.params.id, user: req.user._id });
    if (!sub) return res.status(404).json({ success: false, message: "Subscription not found" });

    await sub.checkExpiry(); // expire if overdue before checking status

    if (sub.status !== "active") {
      return res.status(400).json({
        success: false,
        message: `Cannot pause a ${sub.status} subscription`,
      });
    }

    sub.status   = "paused";
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
    const sub = await Subscription.findOne({ _id: req.params.id, user: req.user._id });
    if (!sub) return res.status(404).json({ success: false, message: "Subscription not found" });

    await sub.checkExpiry(); // expire if overdue before checking

    if (sub.status === "expired") {
      return res.status(400).json({
        success: false,
        message: "Cannot resume an expired subscription. Please subscribe again.",
      });
    }
    if (sub.status !== "paused") {
      return res.status(400).json({ success: false, message: "Subscription is not paused" });
    }

    sub.status   = "active";
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
    const sub = await Subscription.findOne({ _id: req.params.id, user: req.user._id });
    if (!sub) return res.status(404).json({ success: false, message: "Subscription not found" });
    if (sub.status === "cancelled") {
      return res.status(400).json({ success: false, message: "Already cancelled" });
    }
    if (sub.status === "expired") {
      return res.status(400).json({ success: false, message: "Subscription already expired" });
    }

    sub.status       = "cancelled";
    sub.cancelledAt  = new Date();
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
router.get("/admin/all", authenticateToken, authorizeRole("admin"), async (req, res) => {
  try {
    await Subscription.expireOverdue(); // keep statuses accurate for admin too

    const { status, page = 1, limit = 20 } = req.query;
    const filter = status ? { status } : {};

    const subs = await Subscription.find(filter)
      .populate("user",         "firstName lastName email phone")
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
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: SEED default plans
// ─────────────────────────────────────────────────────────────────────────────
router.post("/admin/seed-plans", authenticateToken, authorizeRole("admin"), async (req, res) => {
  try {
    await TiffinPlan.deleteMany({});
    const plans = await TiffinPlan.insertMany([
      {
        name: "Weekly Meal Plan", slug: "weekly", badge: "Popular",
        description: "Get 7 days of curated home-cooked meals.",
        pricePerWeek: 1500, durationDays: 7, mealsPerDay: 1,
        features: ["7 lunches or dinners", "Chef selection", "Dietary customization", "Free delivery"],
        discountPercent: 0,
      },
      {
        name: "Monthly Subscription", slug: "monthly", badge: "Best Value",
        description: "30 days of fresh home-cooked meals with extra savings.",
        pricePerWeek: 5000, durationDays: 30, mealsPerDay: 1,
        features: ["30 days of meals", "Priority chef access", "Full customization", "Free delivery", "10% savings"],
        discountPercent: 10,
      },
      {
        name: "Special Diet Plan", slug: "special-diet", badge: "Health",
        description: "Health-focused plans for diabetic patients and health-conscious eaters.",
        pricePerWeek: 2000, durationDays: 7, mealsPerDay: 1,
        features: ["Nutritionist-guided menus", "Diabetic-friendly", "Soft food options", "Low oil & sugar"],
        discountPercent: 0,
      },
    ]);
    res.json({ success: true, message: "Plans seeded!", data: plans });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;