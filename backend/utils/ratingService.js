// backend/utils/ratingService.js
// ── Bayesian Average Rating System ────────────────────────────────────────────
// Prevents new items with few ratings from outranking established items
// Formula: score = (v/(v+m)) × R + (m/(v+m)) × C
// v = item's rating count, m = minimum threshold
// R = item's average, C = global average

const MenuItem = require('../models/MenuItem');
const User = require('../models/User');

const MIN_RATINGS_THRESHOLD = 5; // m: minimum ratings needed for full weight

// ── Calculate Bayesian Score for a single item ─────────────────────────────
const bayesianScore = (itemAvg, itemCount, globalAvg, threshold = MIN_RATINGS_THRESHOLD) => {
  // When itemCount is very low, score pulls toward global average
  // When itemCount is high, score reflects actual rating
  const score = (itemCount / (itemCount + threshold)) * itemAvg +
                (threshold / (itemCount + threshold)) * globalAvg;
  return Math.round(score * 100) / 100;
};

// ── Update MenuItem Rating after a new review ──────────────────────────────
const updateMenuItemRating = async (menuItemId, newRating) => {
  try {
    const item = await MenuItem.findById(menuItemId);
    if (!item) return;

    const currentCount = item.rating?.count || 0;
    const currentAvg = item.rating?.average || 0;

    // Calculate new running average
    const newCount = currentCount + 1;
    const newAvg = ((currentAvg * currentCount) + newRating) / newCount;

    // Get global average across ALL menu items
    const allItems = await MenuItem.find({ 'rating.count': { $gt: 0 } });
    const globalAvg = allItems.length > 0
      ? allItems.reduce((sum, i) => sum + (i.rating?.average || 0), 0) / allItems.length
      : newAvg;

    // Apply Bayesian formula
    const bayesian = bayesianScore(newAvg, newCount, globalAvg);

    await MenuItem.findByIdAndUpdate(menuItemId, {
      'rating.average': Math.round(newAvg * 10) / 10,
      'rating.count': newCount,
      'rating.bayesianScore': bayesian,
    });

    console.log(`[RATING] ${item.name}: avg=${newAvg.toFixed(2)}, bayesian=${bayesian}, count=${newCount}`);

    // Also update chef's rating
    if (item.createdBy) {
      await updateChefRating(item.createdBy.toString());
    }

    return { average: newAvg, bayesian, count: newCount };
  } catch (error) {
    console.error('Error updating menu item rating:', error);
  }
};

// ── Update Chef Rating based on all their dish ratings ────────────────────
const updateChefRating = async (chefId) => {
  try {
    // Get all dishes by this chef that have ratings
    const chefDishes = await MenuItem.find({
      createdBy: chefId,
      'rating.count': { $gt: 0 },
    });

    if (chefDishes.length === 0) return;

    // Chef rating = weighted average of all their dish ratings
    // Weight = number of ratings per dish (more reviews = more weight)
    const totalWeight = chefDishes.reduce((sum, d) => sum + (d.rating?.count || 0), 0);
    const weightedSum = chefDishes.reduce((sum, d) => {
      return sum + (d.rating?.average || 0) * (d.rating?.count || 0);
    }, 0);

    const chefAvg = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // Get global chef average
    const allChefs = await User.find({ role: 'chef', 'chefProfile.rating': { $gt: 0 } });
    const globalChefAvg = allChefs.length > 0
      ? allChefs.reduce((sum, c) => sum + (c.chefProfile?.rating || 0), 0) / allChefs.length
      : chefAvg;

    // Bayesian for chef (threshold = 10 dish ratings total)
    const chefBayesian = bayesianScore(chefAvg, totalWeight, globalChefAvg, 10);

    await User.findByIdAndUpdate(chefId, {
      'chefProfile.rating': Math.round(chefBayesian * 10) / 10,
      'chefProfile.totalDishRatings': totalWeight,
    });

    console.log(`[CHEF RATING] Chef ${chefId}: bayesian=${chefBayesian.toFixed(2)}, totalRatings=${totalWeight}`);

    return chefBayesian;
  } catch (error) {
    console.error('Error updating chef rating:', error);
  }
};

// ── Get ranked menu items using Bayesian score ────────────────────────────
const getRankedItems = async (limit = 10) => {
  try {
    const items = await MenuItem.find({ isAvailable: true })
      .populate('createdBy', 'firstName lastName chefProfile');

    // Get global average
    const ratedItems = items.filter(i => (i.rating?.count || 0) > 0);
    const globalAvg = ratedItems.length > 0
      ? ratedItems.reduce((sum, i) => sum + (i.rating?.average || 0), 0) / ratedItems.length
      : 3.5;

    // Apply Bayesian to all items and sort
    const ranked = items.map(item => ({
      ...item.toObject(),
      bayesianScore: bayesianScore(
        item.rating?.average || 0,
        item.rating?.count || 0,
        globalAvg
      ),
    })).sort((a, b) => b.bayesianScore - a.bayesianScore);

    return ranked.slice(0, limit);
  } catch (error) {
    console.error('Error getting ranked items:', error);
    return [];
  }
};

module.exports = { updateMenuItemRating, updateChefRating, bayesianScore, getRankedItems };
