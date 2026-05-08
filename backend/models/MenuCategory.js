const mongoose = require('mongoose');

const menuCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        unique: true,
        trim: true,
    },
    slug: {
        type: String,
        required: [true, 'Category slug is required'],
        unique: true,
        lowercase: true,
        trim: true,
    },
    icon: {
        type: String, 
        required: [true, 'Icon is required'],
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
    },
    order: {
        type: Number,
        default: 0,
    },
}, { timestamps: true });

module.exports = mongoose.model('MenuCategory', menuCategorySchema);