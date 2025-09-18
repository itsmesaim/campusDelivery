const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    category: {
        type: String,
        required: true,
        enum: ['Pizza', 'Coffee', 'Sandwiches', 'Indian', 'Chinese', 'Fast Food', 'Desserts', 'Healthy', 'Stationary', 'Main Course', 'Breakfast', 'Beverages']
    },
    image: {
        type: String,
        default: ''
    },
    isVeg: {
        type: Boolean,
        default: true
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    tags: [{
        type: String
    }],
    rating: {
        type: Number,
        default: 4.0,
        min: 1,
        max: 5
    },
    preparationTime: {
        type: String,
        default: '10-15 min'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('MenuItem', menuItemSchema);