require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const MenuItem = require('./models/MenuItem');
  
  let Category;
  try { Category = require('./models/Category'); } 
  catch { Category = require('./models/MenuCategory'); }

  const categories = await Category.find();
  console.log('Found categories:', categories.map(c => c.name));

  // Map subCategory name → category _id
  const catMap = {};
  categories.forEach(c => { catMap[c.name] = c._id; });

  const items = await MenuItem.find();
  console.log(`Found ${items.length} menu items`);

  for (const item of items) {
    const catId = catMap[item.subCategory];
    if (catId) {
      await MenuItem.updateOne({ _id: item._id }, { $set: { category_id: catId } });
      console.log(`✅ Linked "${item.name}" → "${item.subCategory}"`);
    } else {
      console.log(`⚠️  No category found for "${item.name}" (subCategory: ${item.subCategory})`);
    }
  }

  console.log('\n🎉 Done linking items to categories!');
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
























