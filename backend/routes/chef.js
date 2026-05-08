// backend/routes/chef.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const MenuItem = require("../models/MenuItem");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

// Helper: format User → Chef shape that frontend expects
const formatChef = (user) => ({
  _id: user._id,
  name: `${user.firstName} ${user.lastName}`,
  bio: user.chefProfile?.bio || "",
  photo: user.chefProfile?.photo || "",
  specialty: user.chefProfile?.specialty || "Home Cooking",
  location: user.address?.city || "Kathmandu",
  rating: user.chefProfile?.rating || 0,
  totalOrders: user.chefProfile?.totalOrders || 0,
  badges: user.chefProfile?.badges || [],
  experience: user.chefProfile?.experience || "",
  isActive: user.isActive,
  applicationStatus: user.chefProfile?.applicationStatus,
  kitchenLat: user.location?.latitude  || null,
  kitchenLng: user.location?.longitude || null,
});

// GET /api/chefs — public, only approved chefs
router.get("/", async (req, res) => {
  try {
    const chefs = await User.find({
      role: "chef",
      isActive: true,
      "chefProfile.applicationStatus": "approved",
    }).sort({ "chefProfile.rating": -1 });

    res.json({ success: true, chefs: chefs.map(formatChef) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/chefs/:chefId — public, chef + their menu items
router.get("/:chefId", async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.chefId, role: "chef" });
    if (!user) return res.status(404).json({ success: false, message: "Chef not found" });

    const menuItems = await MenuItem.find({ createdBy: req.params.chefId, isAvailable: true });
    res.json({ success: true, chef: formatChef(user), menuItems });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/chefs — admin only (manual chef creation)
router.post("/", authenticateToken, authorizeRole("admin"), async (req, res) => {
  try {
    const { name, bio, photo, specialty, location, phone, badges } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Name is required" });

    const [firstName, ...rest] = name.trim().split(" ");
    const lastName = rest.join(" ") || "Chef";

    const chef = new User({
      firstName,
      lastName,
      email: `chef_${Date.now()}@plateful.com`,
      phone: phone || "9800000000",
      password: Math.random().toString(36).slice(-8) + "A1!",
      role: "chef",
      address: {
        street: location || "Kathmandu",
        city: location || "Kathmandu",
        state: "Bagmati",
        zipCode: "44600",
      },
      chefProfile: {
        bio,
        photo,
        specialty,
        badges: badges || [],
        applicationStatus: "approved",
        approvedAt: new Date(),
      },
    });

    await chef.save();
    res.status(201).json({ success: true, chef: formatChef(chef) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/chefs/:chefId — admin only
router.put("/:chefId", authenticateToken, authorizeRole("admin"), async (req, res) => {
  try {
    const { name, bio, photo, specialty, location, badges } = req.body;
    const updateData = {};

    if (name) {
      const [firstName, ...rest] = name.trim().split(" ");
      updateData.firstName = firstName;
      updateData.lastName = rest.join(" ") || "Chef";
    }
    if (bio !== undefined)       updateData["chefProfile.bio"]       = bio;
    if (photo !== undefined)     updateData["chefProfile.photo"]     = photo;
    if (specialty !== undefined) updateData["chefProfile.specialty"] = specialty;
    if (badges !== undefined)    updateData["chefProfile.badges"]    = badges;
    if (location !== undefined)  updateData["address.city"]          = location;

    const chef = await User.findByIdAndUpdate(req.params.chefId, updateData, { new: true });
    if (!chef) return res.status(404).json({ success: false, message: "Chef not found" });

    res.json({ success: true, chef: formatChef(chef) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/chefs/:chefId — admin only (soft delete)
router.delete("/:chefId", authenticateToken, authorizeRole("admin"), async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.chefId, { isActive: false });
    res.json({ success: true, message: "Chef deactivated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
