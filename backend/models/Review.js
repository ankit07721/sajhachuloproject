const mongoose = require('mongoose');
const MenuItem = require('./MenuItem');

const reviewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    menuItem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MenuItem',
        required: true,
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
    },
    comment: {
        type: String,
        trim: true,
        maxlength: 500,
    },
}, { timestamps: true });

// Prevent a user from leaving multiple reviews for the same item from the same order
reviewSchema.index({ user: 1, menuItem: 1, order: 1 }, { unique: true });

reviewSchema.statics.calculateAverageRating = async function(menuItemId) {
    const stats = await this.aggregate([
        { $match: { menuItem: menuItemId } },
        {
            $group: {
                _id: '$menuItem',
                average: { $avg: '$rating' },
                count: { $sum: 1 }
            }
        }
    ]);

    try {
        if (stats.length > 0) {
            await MenuItem.findByIdAndUpdate(menuItemId, {
                rating: {
                    average: stats[0].average,
                    count: stats[0].count
                }
            });
        } else {
            await MenuItem.findByIdAndUpdate(menuItemId, {
                rating: { average: 0, count: 0 }
            });
        }
    } catch (err) {
        console.error(err);
    }
};

reviewSchema.post('save', function() {
    this.constructor.calculateAverageRating(this.menuItem);
});

reviewSchema.pre('remove', function(next) {
    this.constructor.calculateAverageRating(this.menuItem);
    next();
});


module.exports = mongoose.model('Review', reviewSchema);