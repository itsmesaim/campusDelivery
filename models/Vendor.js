const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    cuisine: {
        type: String,
        required: true,
        enum: ['Pizza', 'Coffee', 'Sandwiches', 'Indian', 'Chinese', 'Fast Food', 'Desserts', 'Healthy', 'Stationary']
    },
    image: {
        type: String,
        default: ''
    },
    rating: {
        type: Number,
        default: 4.0,
        min: 1,
        max: 5
    },
    ownerEmail: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    deliveryTime: {
        type: String,
        default: '15-25 min'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isOnline: {
        type: Boolean,
        default: true
    },
    tags: [{
        type: String
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Vendor', vendorSchema);