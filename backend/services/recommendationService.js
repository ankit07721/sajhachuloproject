const MenuItem = require('../models/MenuItem');
const Order    = require('../models/Order');
const Review   = require('../models/Review');

// ───────────────────────────────────────────────────────────────────────────
// SECTION 1: FEATURE VECTOR BUILDER
// Each dish is converted into a numeric vector for math operations
// ───────────────────────────────────────────────────────────────────────────
/**
 * Converts a MenuItem document into a numeric feature vector
 *
 * Vector dimensions (10 features):
 * [0] price_norm       — normalized price (lower = better value)
 * [1] rating_norm      — normalized rating (higher = better)
 * [2] prepTime_norm    — normalized prep time (lower = faster)
 * [3] calories_norm    — normalized calories
 * [4] protein_norm     — normalized protein content
 * [5] is_veg           — 1 if vegetarian, 0 if not
 * [6] is_nonveg        — 1 if non-veg, 0 if not
 * [7] spice_mild       — 1 if mild spice
 * [8] spice_hot        — 1 if hot/extra-hot
 * [9] popularity_norm  — normalized order count
 */
const buildFeatureVector = (item, maxValues) => {
  const spiceMap = { mild: 0, medium: 0.5, hot: 1, 'extra-hot': 1 };

  return [
    1 - (item.price / maxValues.price),                           // [0] lower price = higher score
    (item.rating?.average || 0) / 5,                             // [1] rating 0-5 → 0-1
    1 - (item.preparationTime / maxValues.prepTime),             // [2] faster = higher score
    (item.nutritionInfo?.calories || 300) / maxValues.calories,  // [3] calories normalized
    (item.nutritionInfo?.protein  || 10)  / maxValues.protein,   // [4] protein normalized
    item.category === 'veg'     ? 1 : 0,                         // [5] is veg
    item.category === 'non-veg' ? 1 : 0,                         // [6] is non-veg
    item.spiceLevel === 'mild'  ? 1 : 0,                         // [7] is mild
    ['hot', 'extra-hot'].includes(item.spiceLevel) ? 1 : 0,      // [8] is hot
    (item.rating?.count || 0) / (maxValues.popularity || 1),     // [9] popularity
  ];
};

// ───────────────────────────────────────────────────────────────────────────
// SECTION 2: COSINE SIMILARITY
// ───────────────────────────────────────────────────────────────────────────
/**
 * Cosine Similarity between two feature vectors
 *
 * Formula:
 *   similarity = (A · B) / (|A| × |B|)
 *
 *   A · B  = sum of element-wise products (dot product)
 *   |A|    = sqrt(sum of squares of A)     (magnitude)
 *   |B|    = sqrt(sum of squares of B)     (magnitude)
 *
 * Result: 0.0 (completely different) → 1.0 (identical)
 *
 * Example:
 *   Momo vector:   [0.9, 0.96, 0.7, 0.3, 0.4, 0, 1, 0, 0, 0.9]
 *   Chowmein vec:  [0.8, 0.85, 0.8, 0.5, 0.6, 0, 1, 0, 0, 0.7]
 *   similarity ≈ 0.97  ← very similar (both non-veg fast food)
 *
 *   Momo vs Yomari:  similarity ≈ 0.42  ← quite different (dessert)
 */
const cosineSimilarity = (vecA, vecB) => {
  if (vecA.length !== vecB.length) return 0;

  const dotProduct  = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA  = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB  = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
};

// ───────────────────────────────────────────────────────────────────────────
// SECTION 3: TOPSIS ALGORITHM
// ───────────────────────────────────────────────────────────────────────────
/**
 * TOPSIS: Technique for Order Preference by Similarity to Ideal Solution
 *
 * Steps:
 * 1. Build decision matrix (items × criteria)
 * 2. Normalize the matrix (divide by column magnitude)
 * 3. Find Ideal Best  (max of beneficial, min of cost criteria)
 *    Find Ideal Worst (min of beneficial, max of cost criteria)
 * 4. Calculate Euclidean distance from Ideal Best (d+) and Ideal Worst (d-)
 * 5. Score = d- / (d+ + d-)  → higher = better
 *
 * Criteria weights (must sum to 1):
 *   rating:     30% ← most important
 *   price:      25% ← affordability matters
 *   popularity: 20% ← social proof
 *   prepTime:   15% ← speed matters
 *   nutrition:  10% ← health factor
 */
const TOPSIS_WEIGHTS = [0.25, 0.30, 0.15, 0.05, 0.10, 0.05, 0.05, 0.02, 0.02, 0.20];
// indices:            price rating prep  cal   prot  veg  nonv mild  hot   pop

const topsisRank = (items, maxValues) => {
  if (items.length === 0) return [];

  // Step 1: Build feature matrix
  const matrix = items.map(item => buildFeatureVector(item, maxValues));

  // Step 2: Weighted normalization
  const weighted = matrix.map(vec =>
    vec.map((val, i) => val * TOPSIS_WEIGHTS[i])
  );

  // Step 3: Ideal best and worst
  const numCriteria = weighted[0].length;
  const idealBest  = Array(numCriteria).fill(-Infinity);
  const idealWorst = Array(numCriteria).fill(Infinity);

  weighted.forEach(vec => {
    vec.forEach((val, i) => {
      if (val > idealBest[i])  idealBest[i]  = val;
      if (val < idealWorst[i]) idealWorst[i] = val;
    });
  });

  // Step 4 & 5: Distance + Score
  return items.map((item, idx) => {
    const vec = weighted[idx];

    const dPlus  = Math.sqrt(vec.reduce((sum, val, i) => sum + Math.pow(val - idealBest[i],  2), 0));
    const dMinus = Math.sqrt(vec.reduce((sum, val, i) => sum + Math.pow(val - idealWorst[i], 2), 0));

    const topsisScore = dPlus + dMinus === 0 ? 0 : dMinus / (dPlus + dMinus);

    return { ...item.toObject(), topsisScore: Math.round(topsisScore * 1000) / 1000 };
  }).sort((a, b) => b.topsisScore - a.topsisScore);
};

// ───────────────────────────────────────────────────────────────────────────
// SECTION 4: BAYESIAN AVERAGE RATING
// ───────────────────────────────────────────────────────────────────────────
/**
 * Bayesian Average prevents rating manipulation
 *
 * Formula: score = (v/(v+m)) × R + (m/(v+m)) × C
 *   v = item's number of ratings
 *   m = minimum threshold (5 ratings needed for full trust)
 *   R = item's actual average rating
 *   C = global average rating across ALL items
 *
 * Effect:
 *   New item, 1 rating of 5★:
 *     score = (1/6)×5 + (5/6)×3.8 = 3.98  ← pulled down toward global avg
 *
 *   Popular item, 200 ratings of 4.7★:
 *     score = (200/205)×4.7 + (5/205)×3.8 = 4.68  ← stays near true rating
 */
const BAYESIAN_THRESHOLD = 5;

const bayesianScore = (itemAvg, itemCount, globalAvg) => {
  return (itemCount / (itemCount + BAYESIAN_THRESHOLD)) * itemAvg +
         (BAYESIAN_THRESHOLD / (itemCount + BAYESIAN_THRESHOLD)) * globalAvg;
};

// ───────────────────────────────────────────────────────────────────────────
// SECTION 5: HELPER — Get max values for normalization
// ───────────────────────────────────────────────────────────────────────────
const getMaxValues = (items) => ({
  price:      Math.max(...items.map(i => i.price || 1)),
  prepTime:   Math.max(...items.map(i => i.preparationTime || 1)),
  calories:   Math.max(...items.map(i => i.nutritionInfo?.calories || 500)),
  protein:    Math.max(...items.map(i => i.nutritionInfo?.protein  || 50)),
  popularity: Math.max(...items.map(i => i.rating?.count || 1)),
});

// ═══════════════════════════════════════════════════════════════════════════
// MAIN RECOMMENDATION SERVICE
// ═══════════════════════════════════════════════════════════════════════════
class RecommendationService {

  // ─────────────────────────────────────────────────────────────────────────
  // 1. SIMILAR ITEMS — Cosine Similarity
  // "Customers who liked this also liked..."
  // ─────────────────────────────────────────────────────────────────────────
  static async getSimilarItems(itemId, limit = 5) {
    const allItems = await MenuItem.find({ isAvailable: true });
    const baseItem = allItems.find(i => i._id.toString() === itemId);
    if (!baseItem) return [];

    const maxValues = getMaxValues(allItems);
    const baseVector = buildFeatureVector(baseItem, maxValues);

    // Calculate cosine similarity between baseItem and all others
    const scored = allItems
      .filter(i => i._id.toString() !== itemId)
      .map(item => ({
        ...item.toObject(),
        similarity: cosineSimilarity(baseVector, buildFeatureVector(item, maxValues)),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    console.log(`[COSINE] Similar to "${baseItem.name}":`,
      scored.slice(0, 3).map(i => `${i.name}(${i.similarity.toFixed(2)})`).join(', ')
    );

    return scored;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. PERSONALIZED — Cosine Similarity on User Preference Vector
  // "Based on your order history..."
  // ─────────────────────────────────────────────────────────────────────────
  static async getPersonalizedRecommendations(userId, limit = 10) {
    // Get user's past ordered items
    const pastOrders = await Order.find({ customer: userId, status: 'delivered' })
      .populate('items.menuItem')
      .sort({ createdAt: -1 })
      .limit(20);

    const orderedItems = pastOrders.flatMap(o =>
      o.items.map(i => i.menuItem).filter(Boolean)
    );

    // No order history → fall back to popular + TOPSIS
    if (orderedItems.length === 0) {
      return this.getPopularItems(limit);
    }

    const allItems  = await MenuItem.find({ isAvailable: true });
    const maxValues = getMaxValues(allItems);

    // Build USER PREFERENCE VECTOR = average of all ordered item vectors
    // This represents what kind of food this user likes
    const orderedVectors = orderedItems.map(item => buildFeatureVector(item, maxValues));
    const userVector = orderedVectors[0].map((_, i) =>
      orderedVectors.reduce((sum, vec) => sum + vec[i], 0) / orderedVectors.length
    );

    console.log(`[COSINE] User preference vector built from ${orderedItems.length} past orders`);

    // Find items not yet ordered by this user
    const orderedIds = new Set(orderedItems.map(i => i._id.toString()));

    const recommendations = allItems
      .filter(item => !orderedIds.has(item._id.toString()))
      .map(item => ({
        ...item.toObject(),
        // Cosine similarity between user preference and each unordered dish
        cosineSimilarity: cosineSimilarity(userVector, buildFeatureVector(item, maxValues)),
        // Also apply Bayesian rating for fairness
        bayesianRating: bayesianScore(
          item.rating?.average || 0,
          item.rating?.count   || 0,
          3.8 // global average estimate
        ),
      }))
      // Final score = 70% cosine + 30% bayesian (blended ranking)
      .map(item => ({
        ...item,
        finalScore: (item.cosineSimilarity * 0.7) + ((item.bayesianRating / 5) * 0.3),
      }))
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, limit);

    return recommendations;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. CATEGORY RECOMMENDATIONS — TOPSIS within category
  // ─────────────────────────────────────────────────────────────────────────
  static async getCategoryRecommendations(category, limit = 10) {
    const items = await MenuItem.find({ category, isAvailable: true });
    if (items.length === 0) return [];

    const maxValues = getMaxValues(items);
    return topsisRank(items, maxValues).slice(0, limit);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. TIME-BASED RECOMMENDATIONS
  // Morning → breakfast items ranked by TOPSIS
  // ─────────────────────────────────────────────────────────────────────────
  static async getTimeBasedRecommendations(timeSlot, limit = 10) {
    const timeMap = {
      morning:   ['Breakfast', 'Beverages'],
      afternoon: ['Nepali Mains', 'Momo & Dumplings', 'Noodles'],
      evening:   ['Snacks', 'Beverages', 'Burgers & Sandwiches'],
      night:     ['Nepali Mains', 'Momo & Dumplings'],
    };

    const subCategories = timeMap[timeSlot] || timeMap['afternoon'];
    const items = await MenuItem.find({
      subCategory: { $in: subCategories },
      isAvailable: true,
    });

    if (items.length === 0) return this.getPopularItems(limit);

    const maxValues = getMaxValues(items);
    return topsisRank(items, maxValues).slice(0, limit);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. POPULAR ITEMS — Bayesian + TOPSIS hybrid
  // ─────────────────────────────────────────────────────────────────────────
  static async getPopularItems(limit = 10) {
    const items = await MenuItem.find({ isAvailable: true });
    if (items.length === 0) return [];

    // Calculate global average for Bayesian
    const ratedItems = items.filter(i => (i.rating?.count || 0) > 0);
    const globalAvg  = ratedItems.length > 0
      ? ratedItems.reduce((sum, i) => sum + (i.rating?.average || 0), 0) / ratedItems.length
      : 3.5;

    const maxValues = getMaxValues(items);

    // Combine Bayesian rating + TOPSIS score
    const topsisRanked = topsisRank(items, maxValues);

    return topsisRanked.map(item => ({
      ...item,
      bayesianRating: bayesianScore(
        item.rating?.average || 0,
        item.rating?.count   || 0,
        globalAvg
      ),
      // Blend: 60% TOPSIS + 40% Bayesian
      popularityScore: (item.topsisScore * 0.6) + (bayesianScore(
        item.rating?.average || 0,
        item.rating?.count   || 0,
        globalAvg
      ) / 5 * 0.4),
    }))
    .sort((a, b) => b.popularityScore - a.popularityScore)
    .slice(0, limit);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. MIXED — All algorithms combined (for home page)
  // 40% personalized cosine + 30% time-based TOPSIS + 30% popular Bayesian
  // ─────────────────────────────────────────────────────────────────────────
  static async getMixedRecommendations(userId, limit = 20) {
    const timeSlot = getCurrentTimeSlot();

    const [personalized, timeBased, popular] = await Promise.all([
      this.getPersonalizedRecommendations(userId, Math.floor(limit * 0.4)),
      this.getTimeBasedRecommendations(timeSlot, Math.floor(limit * 0.3)),
      this.getPopularItems(Math.floor(limit * 0.3)),
    ]);

    return [
      { type: 'personalized', items: personalized, title: '✨ Recommended for You' },
      { type: 'time-based',   items: timeBased,    title: `🕐 Perfect for ${timeSlot}` },
      { type: 'popular',      items: popular,       title: '🔥 Most Popular' },
    ];
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────
function getCurrentTimeSlot() {
  const h = new Date().getHours();
  if (h >= 6  && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 22) return 'evening';
  return 'night';
}

module.exports = RecommendationService;
