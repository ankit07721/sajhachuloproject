// backend/models/Subscription.js
const mongoose = require("mongoose");
 
const subscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: "TiffinPlan", required: true },
    planName:  { type: String, required: true },
    planSlug:  { type: String, required: true },
 
    preferences: {
      mealType:        { type: String, enum: ["veg","non-veg","both"],    default: "both" },
      mealTime:        { type: String, enum: ["lunch","dinner","both"],   default: "both" },
      spiceLevel:      { type: String, enum: ["mild","medium","hot"],     default: "medium" },
      specialRequests: { type: String, maxlength: 300 },
    },
 
    deliveryAddress: {
      street: String, city: String, landmark: String, phone: String,
    },
 
    startDate: { type: Date, required: true },
    endDate:   { type: Date, required: true },
 
    status: {
      type: String,
      enum: ["active","paused","cancelled","expired"],
      default: "active",
    },
 
    totalAmount:   { type: Number, required: true },
    paymentStatus: { type: String, enum: ["pending","paid"],           default: "pending" },
    paymentMethod: { type: String, enum: ["khalti","esewa","cod"],     default: "cod" },
 
    assignedChef:     { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    assignedChefName: { type: String, default: null },
 
    pausedAt:     { type: Date },
    cancelledAt:  { type: Date },
    cancelReason: { type: String },
  },
  { timestamps: true }
);
 
// ── FIX 1: checkExpiry handles BOTH active and paused ────────────────────────
// OLD BUG: only checked "active" → paused subs past endDate never expired
subscriptionSchema.methods.checkExpiry = async function () {
  if (
    (this.status === "active" || this.status === "paused") &&
    new Date() > new Date(this.endDate)
  ) {
    this.status = "expired";
    await this.save();
    console.log(`[SUB EXPIRED] ${this.planName} for user ${this.user}`);
  }
  return this;
};
 
// ── FIX 2: Static method to expire ALL overdue at once ───────────────────────
// Called at server startup + every hour via cron
subscriptionSchema.statics.expireOverdue = async function () {
  const result = await this.updateMany(
    {
      status:  { $in: ["active", "paused"] },
      endDate: { $lt: new Date() },           // endDate is in the PAST
    },
    { $set: { status: "expired" } }
  );
  if (result.modifiedCount > 0) {
    console.log(`[SUB CRON] Auto-expired ${result.modifiedCount} subscriptions`);
  }
  return result.modifiedCount;
};
 
subscriptionSchema.index({ user: 1, status: 1 });
subscriptionSchema.index({ endDate: 1 });
 
module.exports = mongoose.model("Subscription", subscriptionSchema);
 