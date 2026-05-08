// backend/models/TiffinPlan.js
const mongoose = require("mongoose");

const tiffinPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },          // "Weekly Meal Plan"
    slug: { type: String, required: true, unique: true }, // "weekly"
    badge: { type: String, default: "" },             // "Popular"
    description: { type: String, required: true },
    pricePerWeek: { type: Number, required: true },   // base price
    durationDays: { type: Number, required: true },   // 7 or 30
    mealsPerDay: { type: Number, default: 1 },
    features: [{ type: String }],
    isActive: { type: Boolean, default: true },
    discountPercent: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TiffinPlan", tiffinPlanSchema);