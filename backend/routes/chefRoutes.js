// backend/routes/chefRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const MenuItem = require('../models/MenuItem');
const Review = require('../models/Review');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// ── Multer for chef photo ─────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/chefs');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `chef_${req.user._id}_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    /jpeg|jpg|png|webp/.test(file.mimetype) ? cb(null, true) : cb(new Error('Images only'));
  },
});

// ── Apply ─────────────────────────────────────────────────────────────────────
router.post('/apply', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, address, bio, specialty, experience, kitchenImages, idProofImage, location } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email already registered.' });

    const chef = new User({
      firstName, lastName, email, phone, password, address,
      role: 'chef',
      chefProfile: { bio, specialty, experience, kitchenImages: kitchenImages || [], idProofImage: idProofImage || '', applicationStatus: 'pending' },
      location: location ? { latitude: location.latitude, longitude: location.longitude, address: location.address || address } : undefined,
    });
    await chef.save();
    res.status(201).json({ success: true, message: 'Application submitted! Admin will review your account.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/dashboard', authenticateToken, authorizeRole('chef'), async (req, res) => {
  try {
    const chef    = await User.findById(req.user._id).select('-password');
    const myItems = await MenuItem.find({ createdBy: req.user._id });

    // Recent reviews on chef's dishes
    const myItemIds = myItems.map(i => i._id);
    const recentReviews = await Review.find({ menuItem: { $in: myItemIds } })
      .populate('user',     'firstName lastName')
      .populate('menuItem', 'name image')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({ success: true, data: { chef, totalItems: myItems.length, myItems, recentReviews } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Get profile + all reviews ─────────────────────────────────────────────────
router.get('/profile', authenticateToken, authorizeRole('chef'), async (req, res) => {
  try {
    const chef    = await User.findById(req.user._id).select('-password');
    const myItems = await MenuItem.find({ createdBy: req.user._id });
    const myItemIds = myItems.map(i => i._id);

    const reviews = await Review.find({ menuItem: { $in: myItemIds } })
      .populate('user',     'firstName lastName')
      .populate('menuItem', 'name image')
      .sort({ createdAt: -1 });

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => { distribution[r.rating] = (distribution[r.rating] || 0) + 1; });

    res.json({ success: true, data: { chef, myItems, reviews, totalReviews: reviews.length, distribution } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Update profile ────────────────────────────────────────────────────────────
router.put('/profile', authenticateToken, authorizeRole('chef'), async (req, res) => {
  try {
    const { bio, specialty, experience } = req.body;
    const chef = await User.findByIdAndUpdate(
      req.user._id,
      { 'chefProfile.bio': bio, 'chefProfile.specialty': specialty, 'chefProfile.experience': experience },
      { new: true }
    ).select('-password');
    res.json({ success: true, data: chef, message: 'Profile updated!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Upload photo ──────────────────────────────────────────────────────────────
router.post('/upload-photo', authenticateToken, authorizeRole('chef'), upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const photoUrl = `/uploads/chefs/${req.file.filename}`;
    await User.findByIdAndUpdate(req.user._id, { 'chefProfile.photo': photoUrl });
    res.json({ success: true, message: 'Photo uploaded!', photoUrl });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Admin routes ──────────────────────────────────────────────────────────────
router.get('/admin/applications', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const chefs = await User.find({ role: 'chef', 'chefProfile.applicationStatus': status }).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, data: chefs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/admin/:id/approve', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const chef = await User.findByIdAndUpdate(req.params.id, { 'chefProfile.applicationStatus': 'approved', 'chefProfile.approvedAt': new Date(), isActive: true }, { new: true }).select('-password');
    if (!chef) return res.status(404).json({ success: false, message: 'Chef not found' });
    res.json({ success: true, message: 'Chef approved!', data: chef });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/admin/:id/reject', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const chef = await User.findByIdAndUpdate(req.params.id, { 'chefProfile.applicationStatus': 'rejected', 'chefProfile.rejectedAt': new Date(), 'chefProfile.applicationNote': req.body.reason || 'Application rejected.', isActive: false }, { new: true }).select('-password');
    if (!chef) return res.status(404).json({ success: false, message: 'Chef not found' });
    res.json({ success: true, message: 'Chef rejected.', data: chef });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/admin/all', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const chefs = await User.find({ role: 'chef' }).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, data: chefs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;