// backend/routes/categories.js
const express = require('express');
const router = express.Router();
const MenuCategory = require('../models/MenuCategory');
const MenuItem = require('../models/MenuItem');
const LocationService = require('../services/locationService');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// ── Max distance a chef can be from customer (km) ────────────────────────────
const MAX_CHEF_DISTANCE_KM = 7;

// ── Haversine helper (reuse from LocationService) ────────────────────────────
const getChefDistance = (chefLat, chefLon, customerLat, customerLon) => {
  return LocationService.calculateHaversineDistance(
    chefLat, chefLon,
    customerLat, customerLon
  );
};

// ── GET /api/categories ───────────────────────────────────────────────────────
// Optional query params: ?lat=27.71&lng=85.32
// If coords provided → filter chef dishes by distance
router.get('/', async (req, res) => {
  try {
    const categories = await MenuCategory.find().sort({ order: 1 });

    // Get customer coordinates from query params (sent by frontend)
    const customerLat = parseFloat(req.query.lat);
    const customerLon = parseFloat(req.query.lng);
    const hasCustomerLocation = !isNaN(customerLat) && !isNaN(customerLon);

    // Fetch all available items with chef info
    const menuItems = await MenuItem.find({ isAvailable: true })
      .populate({
        path: 'createdBy',
        select: 'firstName lastName role location chefProfile',
      });

    // ── Filter items using Haversine distance check ───────────────────────
    const filteredItems = menuItems.filter((item) => {
      const creator = item.createdBy;
      if (!creator) return true; // No creator → always show

      // Admin items → always show
      if (creator.role === 'admin') return true;

      // Chef items → check distance if customer location available
      if (creator.role === 'chef') {
        // If customer location not provided → show all chef items
        if (!hasCustomerLocation) return true;

        // If chef has no kitchen location stored → show item (don't penalize)
        const chefLat = creator.location?.latitude;
        const chefLon = creator.location?.longitude;
        if (!chefLat || !chefLon) return true;

        // ── HAVERSINE CHECK ──────────────────────────────────────────────
        const distanceKm = getChefDistance(
          chefLat, chefLon,
          customerLat, customerLon
        );

        // Only show if chef is within MAX_CHEF_DISTANCE_KM
        const withinRange = distanceKm <= MAX_CHEF_DISTANCE_KM;

        if (!withinRange) {
          console.log(
            `[DISTANCE FILTER] Chef ${creator.firstName} is ${distanceKm.toFixed(1)}km away → HIDDEN`
          );
        }

        return withinRange;
      }

      return true;
    });

    // ── Build category response with filtered items ───────────────────────
    const populatedCategories = categories.map((category) => {
      const items = filteredItems
        .filter((item) => item.subCategory === category.name)
        .map((item) => {
          const creator = item.createdBy;
          const isChef = creator?.role === 'chef';

          // Calculate distance for display (only for chef items)
          let distanceFromCustomer = null;
          if (
            isChef &&
            hasCustomerLocation &&
            creator.location?.latitude
          ) {
            distanceFromCustomer = getChefDistance(
              creator.location.latitude,
              creator.location.longitude,
              customerLat,
              customerLon
            );
          }

          return {
            ...item.toObject(),
            chefName: isChef
              ? `${creator.firstName} ${creator.lastName}`
              : null,
            chefId: isChef ? creator._id : null,
            chefDistance: distanceFromCustomer
              ? Math.round(distanceFromCustomer * 10) / 10
              : null, // km, shown on card
          };
        });

      return { ...category.toObject(), items };
    });

    // ── Summary log ───────────────────────────────────────────────────────
    if (hasCustomerLocation) {
      const totalItems = menuItems.length;
      const shownItems = filteredItems.length;
      const hiddenItems = totalItems - shownItems;
      console.log(
        `[MENU FILTER] Customer at (${customerLat}, ${customerLon}) | ` +
        `Showing ${shownItems}/${totalItems} items | ` +
        `${hiddenItems} chef items hidden (>${MAX_CHEF_DISTANCE_KM}km)`
      );
    }

    res.json({
      success: true,
      data: populatedCategories,
      meta: {
        customerLocation: hasCustomerLocation
          ? { lat: customerLat, lon: customerLon }
          : null,
        maxChefDistance: MAX_CHEF_DISTANCE_KM,
        distanceFilterActive: hasCustomerLocation,
      },
    });
  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// ── Admin routes ──────────────────────────────────────────────────────────────
router.post('/', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const newCategory = new MenuCategory(req.body);
    await newCategory.save();
    res.status(201).json({ success: true, data: newCategory });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const category = await MenuCategory.findByIdAndUpdate(
      req.params.id, req.body, { new: true }
    );
    res.json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    await MenuCategory.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;   