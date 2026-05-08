require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB Connected!");
};

// ── Models ────────────────────────────────────────────────────────────────────
const User = require("./models/User");
const MenuItem = require("./models/MenuItem");
const TiffinPlan = require("./models/TiffinPlan");

const seed = async () => {
  await connectDB();

  // ── 1. Admin User ────────────────────────────────────────────────────────────
  console.log("\n🌱 Seeding admin user...");
  const existing = await User.findOne({ role: "admin" });
  if (existing) {
    console.log("⚠️  Admin already exists:", existing.email);
  } else {
    const hash = await bcrypt.hash("admin123", 10);
    await User.create({
      firstName: "Admin",
      lastName: "Plateful",
      email: "admin@plateful.com",
      password: hash,
      role: "admin",
      phone: "9800000000",
      isActive: true,
      address: {
        street: "Thamel Marg",
        city: "Kathmandu",
        state: "Bagmati",
        zipCode: "44600",
      },
    });
    console.log("✅ Admin created! Email: admin@plateful.com | Password: admin123");
  }

  // ── 2. Menu Items ────────────────────────────────────────────────────────────
  console.log("\n🌱 Seeding menu items...");
  const adminUser = await User.findOne({ role: "admin" });

  const existingItems = await MenuItem.countDocuments();
  if (existingItems > 0) {
    console.log(`⚠️  ${existingItems} menu items already exist, skipping...`);
  } else {
    const menuItems = [
      {
        name: "Aloo Tarkari with Sel Roti",
        description: "Traditional Nepali breakfast with crispy sel roti and spiced potato curry.",
        price: 100,
        category: "veg",
        subCategory: "Breakfast",
        image: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400",
        ingredients: ["potato", "sel roti", "spices", "oil"],
        nutritionInfo: { calories: 470, protein: 8, carbs: 80, fat: 14, fiber: 4 },
        isVegetarian: true,
        spiceLevel: "mild",
        preparationTime: 15,
        isAvailable: true,
        tags: ["traditional", "breakfast", "festive"],
        createdBy: adminUser._id,
      },
      {
        name: "Pyaaz ko Pakora",
        description: "Crispy onion fritters made with gram flour and spices.",
        price: 50,
        category: "veg",
        subCategory: "Snacks",
        image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400",
        ingredients: ["onion", "gram flour", "spices", "oil"],
        nutritionInfo: { calories: 320, protein: 9, carbs: 33, fat: 18, fiber: 4 },
        isVegetarian: true,
        spiceLevel: "medium",
        preparationTime: 15,
        isAvailable: true,
        tags: ["crispy", "snack", "rainy-day"],
        createdBy: adminUser._id,
      },
      {
        name: "Samosa (2 pcs)",
        description: "Golden crispy pastry filled with spiced potatoes and peas.",
        price: 48,
        category: "veg",
        subCategory: "Snacks",
        image: "https://images.unsplash.com/photo-1601050690117-94f5f7a5b4b2?w=400",
        ingredients: ["potato", "peas", "pastry", "spices"],
        nutritionInfo: { calories: 290, protein: 5, carbs: 36, fat: 14, fiber: 3 },
        isVegetarian: true,
        spiceLevel: "mild",
        preparationTime: 10,
        isAvailable: true,
        tags: ["crispy", "budget", "snack"],
        createdBy: adminUser._id,
      },
      {
        name: "Veg Thali",
        description: "Complete Nepali vegetarian meal with rice, dal, vegetables and pickle.",
        price: 150,
        category: "veg",
        subCategory: "Nepali Mains",
        image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400",
        ingredients: ["rice", "dal", "vegetables", "pickle", "papad"],
        nutritionInfo: { calories: 520, protein: 16, carbs: 82, fat: 12, fiber: 9 },
        isVegetarian: true,
        spiceLevel: "mild",
        preparationTime: 15,
        isAvailable: true,
        tags: ["balanced", "traditional", "filling"],
        createdBy: adminUser._id,
      },
      {
        name: "Chicken Thali",
        description: "Complete Nepali meal with chicken curry, rice, dal and pickle.",
        price: 250,
        category: "non-veg",
        subCategory: "Nepali Mains",
        image: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400",
        ingredients: ["chicken", "rice", "dal", "vegetables", "pickle"],
        nutritionInfo: { calories: 680, protein: 38, carbs: 68, fat: 22, fiber: 6 },
        isVegetarian: false,
        spiceLevel: "medium",
        preparationTime: 30,
        isAvailable: true,
        tags: ["protein-rich", "filling", "non-veg"],
        createdBy: adminUser._id,
      },
      {
        name: "Dhido Set (Veg)",
        description: "Traditional buckwheat dhido with vegetable curry and gundruk soup.",
        price: 200,
        category: "veg",
        subCategory: "Nepali Mains",
        image: "https://images.unsplash.com/photo-1547592180-85f173990554?w=400",
        ingredients: ["buckwheat flour", "vegetables", "gundruk", "butter"],
        nutritionInfo: { calories: 420, protein: 14, carbs: 68, fat: 8, fiber: 10 },
        isVegetarian: true,
        isGlutenFree: true,
        spiceLevel: "mild",
        preparationTime: 25,
        isAvailable: true,
        tags: ["healthy", "high-fiber", "anti-diabetic"],
        createdBy: adminUser._id,
      },
      {
        name: "Chicken Dhido Set",
        description: "Traditional dhido served with spicy chicken curry and fresh vegetables.",
        price: 249,
        category: "non-veg",
        subCategory: "Nepali Mains",
        image: "https://images.unsplash.com/photo-1574484284002-952d92456975?w=400",
        ingredients: ["buckwheat flour", "chicken", "vegetables", "spices"],
        nutritionInfo: { calories: 580, protein: 40, carbs: 62, fat: 18, fiber: 8 },
        isVegetarian: false,
        spiceLevel: "medium",
        preparationTime: 30,
        isAvailable: true,
        tags: ["protein-rich", "filling", "high-fiber"],
        createdBy: adminUser._id,
      },
      {
        name: "Buff Jhol Momo",
        description: "Steamed buffalo dumplings served in a spicy tomato broth soup.",
        price: 140,
        category: "non-veg",
        subCategory: "Momo & Dumplings",
        image: "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400",
        ingredients: ["buff", "flour", "tomato", "spices", "onion"],
        nutritionInfo: { calories: 310, protein: 18, carbs: 35, fat: 10, fiber: 3 },
        isVegetarian: false,
        spiceLevel: "medium",
        preparationTime: 20,
        isAvailable: true,
        tags: ["popular", "street-food", "soupy"],
        createdBy: adminUser._id,
      },
      {
        name: "Veg Momo",
        description: "Steamed vegetable dumplings served with spicy tomato chutney.",
        price: 57,
        category: "veg",
        subCategory: "Momo & Dumplings",
        image: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400",
        ingredients: ["vegetables", "flour", "spices", "cabbage"],
        nutritionInfo: { calories: 240, protein: 8, carbs: 40, fat: 4, fiber: 3 },
        isVegetarian: true,
        spiceLevel: "mild",
        preparationTime: 15,
        isAvailable: true,
        tags: ["light", "budget", "popular"],
        createdBy: adminUser._id,
      },
      {
        name: "Chicken Chowmein",
        description: "Stir-fried noodles with chicken and fresh vegetables in savory sauce.",
        price: 200,
        category: "non-veg",
        subCategory: "Noodles",
        image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400",
        ingredients: ["noodles", "chicken", "vegetables", "soy sauce"],
        nutritionInfo: { calories: 520, protein: 28, carbs: 62, fat: 16, fiber: 3 },
        isVegetarian: false,
        spiceLevel: "medium",
        preparationTime: 15,
        isAvailable: true,
        tags: ["quick", "popular", "street-food"],
        createdBy: adminUser._id,
      },
      {
        name: "Wai Wai Sadheko",
        description: "Spicy crunchy instant noodles tossed with fresh herbs and spices.",
        price: 100,
        category: "veg",
        subCategory: "Noodles",
        image: "https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=400",
        ingredients: ["wai wai noodles", "onion", "tomato", "coriander", "spices"],
        nutritionInfo: { calories: 400, protein: 9, carbs: 52, fat: 17, fiber: 2 },
        isVegetarian: true,
        spiceLevel: "hot",
        preparationTime: 10,
        isAvailable: true,
        tags: ["spicy", "quick", "budget", "crunchy"],
        createdBy: adminUser._id,
      },
      {
        name: "Grilled Paneer Sandwich",
        description: "Toasted sandwich with spiced paneer, vegetables and mint chutney.",
        price: 180,
        category: "veg",
        subCategory: "Burgers & Sandwiches",
        image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400",
        ingredients: ["bread", "paneer", "vegetables", "mint chutney"],
        nutritionInfo: { calories: 390, protein: 18, carbs: 38, fat: 18, fiber: 4 },
        isVegetarian: true,
        spiceLevel: "mild",
        preparationTime: 10,
        isAvailable: true,
        tags: ["modern", "grilled", "filling"],
        createdBy: adminUser._id,
      },
      {
        name: "Yomari",
        description: "Traditional Newari steamed rice flour dumpling filled with chaku and sesame.",
        price: 80,
        category: "dessert",
        subCategory: "Desserts & Sweets",
        image: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400",
        ingredients: ["rice flour", "chaku", "sesame", "coconut"],
        nutritionInfo: { calories: 280, protein: 5, carbs: 55, fat: 5, fiber: 2 },
        isVegetarian: true,
        spiceLevel: "mild",
        preparationTime: 20,
        isAvailable: true,
        tags: ["Newari", "festive", "sweet"],
        createdBy: adminUser._id,
      },
      {
        name: "Masala Chiya",
        description: "Warming spiced milk tea with cardamom, ginger and cinnamon.",
        price: 40,
        category: "beverage",
        subCategory: "Beverages",
        image: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400",
        ingredients: ["tea", "milk", "cardamom", "ginger", "cinnamon", "sugar"],
        nutritionInfo: { calories: 85, protein: 3, carbs: 12, fat: 3, fiber: 0 },
        isVegetarian: true,
        spiceLevel: "mild",
        preparationTime: 5,
        isAvailable: true,
        tags: ["warming", "energizing", "budget"],
        createdBy: adminUser._id,
      },
    ];

    await MenuItem.insertMany(menuItems);
    console.log(`✅ ${menuItems.length} menu items created!`);
  }

  // ── 3. Tiffin Plans ──────────────────────────────────────────────────────────
  console.log("\n🌱 Seeding tiffin plans...");
  const existingPlans = await TiffinPlan.countDocuments();
  if (existingPlans > 0) {
    console.log(`⚠️  ${existingPlans} tiffin plans already exist, skipping...`);
  } else {
    await TiffinPlan.insertMany([
      {
        name: "Weekly Meal Plan",
        slug: "weekly",
        badge: "Popular",
        description: "Get 7 days of curated home-cooked meals. Perfect for busy professionals.",
        pricePerWeek: 1500,
        durationDays: 7,
        mealsPerDay: 1,
        features: ["7 lunches or dinners", "Chef selection", "Dietary customization", "Free delivery"],
        discountPercent: 0,
      },
      {
        name: "Monthly Subscription",
        slug: "monthly",
        badge: "Best Value",
        description: "Best value! Enjoy 30 days of fresh home-cooked meals with extra savings.",
        pricePerWeek: 5000,
        durationDays: 30,
        mealsPerDay: 1,
        features: ["30 days of meals", "Priority chef access", "Full dietary customization", "Free delivery", "10% savings"],
        discountPercent: 10,
      },
      {
        name: "Special Diet Plan",
        slug: "special-diet",
        badge: "Health",
        description: "Health-focused meal plans for diabetic patients, elderly, and health-conscious eaters.",
        pricePerWeek: 2000,
        durationDays: 7,
        mealsPerDay: 1,
        features: ["Nutritionist-guided menus", "Diabetic-friendly options", "Soft food options", "Low oil & low sugar"],
        discountPercent: 0,
      },
    ]);
    console.log("✅ 3 tiffin plans created!");
  }

  console.log("\n🎉 Seeding complete!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Admin login:");
  console.log("  Email:    admin@plateful.com");
  console.log("  Password: admin123");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  process.exit(0);
};

seed().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});