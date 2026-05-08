// backend/models/Chef.js
const mongoose = require("mongoose");

const chefSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    bio:         { type: String, default: "" },
    photo:       { type: String, default: "" },
    specialty:   { type: String, default: "" },
    location:    { type: String, default: "" },
    phone:       { type: String },
    isActive:    { type: Boolean, default: true },
    rating:      { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    badges:      [{ type: String }],
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Chef", chefSchema);
