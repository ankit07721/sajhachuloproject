require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const User = require('./models/User');

  // ── Fix Admin ──────────────────────────────────────────────────────────────
  await User.deleteOne({ email: 'admin@plateful.com' });
  console.log('🗑️  Old admin deleted');

  const admin = new User({
    firstName: 'Admin',
    lastName: 'Plateful',
    email: 'admin@plateful.com',
    password: 'admin123',  // User model will auto-hash this on save
    role: 'admin',
    phone: '9800000000',
    isActive: true,
    address: {
      street: 'Thamel Marg',
      city: 'Kathmandu',
      state: 'Bagmati',
      zipCode: '44600',
    },
  });
  await admin.save();
  console.log('✅ Admin fixed! Email: admin@plateful.com | Password: admin123');

  // ── Fix Categories ─────────────────────────────────────────────────────────
  // Try both Category and MenuCategory model names
  let Category;
  try {
    Category = require('./models/Category');
  } catch {
    try {
      Category = require('./models/MenuCategory');
    } catch {
      console.log('⚠️  No Category model found - skipping categories');
      process.exit(0);
    }
  }

  await Category.deleteMany({});
  await Category.insertMany([
    { name: 'Breakfast',           slug: 'breakfast',          icon: '🌅', description: 'Morning meals',       order: 1 },
    { name: 'Snacks',              slug: 'snacks',             icon: '🍟', description: 'Light bites',         order: 2 },
    { name: 'Nepali Mains',        slug: 'nepali-mains',       icon: '🍱', description: 'Traditional meals',   order: 3 },
    { name: 'Momo & Dumplings',    slug: 'momo-dumplings',     icon: '🥟', description: 'Dumplings',           order: 4 },
    { name: 'Noodles',             slug: 'noodles',            icon: '🍜', description: 'Noodle dishes',       order: 5 },
    { name: 'Burgers & Sandwiches',slug: 'burgers-sandwiches', icon: '🥪', description: 'Sandwiches',          order: 6 },
    { name: 'Desserts & Sweets',   slug: 'desserts-sweets',    icon: '🍮', description: 'Sweet treats',        order: 7 },
    { name: 'Beverages',           slug: 'beverages',          icon: '☕', description: 'Drinks',              order: 8 },
  ]);
  console.log('✅ 8 categories created!');

  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
