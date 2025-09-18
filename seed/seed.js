const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Vendor = require('../models/Vendor');
const MenuItem = require('../models/MenuItem');

const connectDB = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for seeding...');
};

const seedDatabase = async () => {
    try {
        await connectDB();

        // Clear existing data
        await User.deleteMany({});
        await Vendor.deleteMany({});
        await MenuItem.deleteMany({});
        console.log('Cleared existing data...');

        // Create Admin User (Hardcoded)
        const adminUser = new User({
            name: 'Campus Admin',
            email: 'admin@campus.edu',
            password: 'admin123', // Will be hashed automatically
            mobile: '9999999999',
            address: 'Admin Office, Main Campus',
            role: 'admin'
        });
        await adminUser.save();
        console.log('Admin user created: admin@campus.edu / admin123');

        // Create Vendor Users
        const pizzaOwner = new User({
            name: 'Mario Rossi',
            email: 'mario@campuspizza.com',
            password: 'pizza123',
            mobile: '9876543210',
            address: 'Food Court, Campus',
            role: 'vendor'
        });
        await pizzaOwner.save();

        const cafeOwner = new User({
            name: 'Sarah Johnson',
            email: 'sarah@studyfuel.com',
            password: 'cafe123',
            mobile: '9876543211',
            address: 'Library Building, Campus',
            role: 'vendor'
        });
        await cafeOwner.save();

        const storeOwner = new User({
            name: 'David Kim',
            email: 'david@campusstore.com',
            password: 'store123',
            mobile: '9876543212',
            address: 'Student Center, Campus',
            role: 'vendor'
        });
        await storeOwner.save();

        // Create Sample Students
        const students = [
            {
                name: 'John Doe',
                email: 'john@student.edu',
                password: 'student123',
                mobile: '8765432100',
                address: 'Dorm A, Room 201',
                role: 'student'
            },
            {
                name: 'Jane Smith',
                email: 'jane@student.edu',
                password: 'student123',
                mobile: '8765432101',
                address: 'Dorm B, Room 105',
                role: 'student'
            }
        ];

        for (const studentData of students) {
            const student = new User(studentData);
            await student.save();
        }

        // Create Vendors
        const campusPizza = new Vendor({
            name: 'Campus Pizza',
            description: 'Fresh pizza made with local ingredients',
            cuisine: 'Pizza',
            image: '',
            rating: 4.5,
            deliveryTime: '15-25 min',
            isActive: true,
            isOnline: true,
            tags: ['Italian', 'Fast Food', 'Popular']
        });
        await campusPizza.save();

        const studyFuelCafe = new Vendor({
            name: 'Study Fuel Cafe',
            description: 'Artisan coffee and healthy snacks',
            cuisine: 'Coffee',
            image: '',
            rating: 4.8,
            deliveryTime: '10-15 min',
            isActive: true,
            isOnline: true,
            tags: ['Coffee', 'Healthy', 'Study']
        });
        await studyFuelCafe.save();

        const campusStore = new Vendor({
            name: 'Campus Store',
            description: 'Books, supplies, and essentials',
            cuisine: 'Stationary',
            image: '',
            rating: 4.0,
            deliveryTime: '5-10 min',
            isActive: true,
            isOnline: true,
            tags: ['Books', 'Supplies', 'Essentials']
        });
        await campusStore.save();

        // Create Menu Items
        const pizzaItems = [
            {
                vendorId: campusPizza._id,
                name: 'Margherita Pizza',
                description: 'Classic pizza with tomatoes, mozzarella, and basil',
                price: 180,
                category: 'Pizza',
                isVeg: true,
                isAvailable: true,
                rating: 4.5
            },
            {
                vendorId: campusPizza._id,
                name: 'Pepperoni Pizza',
                description: 'Spicy pepperoni with mozzarella cheese',
                price: 220,
                category: 'Pizza',
                isVeg: false,
                isAvailable: true,
                rating: 4.3
            },
            {
                vendorId: campusPizza._id,
                name: 'Garlic Bread',
                description: 'Crispy bread with garlic butter',
                price: 80,
                category: 'Pizza',
                isVeg: true,
                isAvailable: true,
                rating: 4.0
            }
        ];

        const cafeItems = [
            {
                vendorId: studyFuelCafe._id,
                name: 'Cappuccino',
                description: 'Rich espresso with steamed milk',
                price: 120,
                category: 'Coffee',
                isVeg: true,
                isAvailable: true,
                rating: 4.8
            },
            {
                vendorId: studyFuelCafe._id,
                name: 'Grilled Sandwich',
                description: 'Healthy grilled sandwich with vegetables',
                price: 160,
                category: 'Sandwiches',
                isVeg: true,
                isAvailable: true,
                rating: 4.5
            },
            {
                vendorId: studyFuelCafe._id,
                name: 'Energy Smoothie',
                description: 'Fresh fruit smoothie for energy boost',
                price: 140,
                category: 'Beverages',
                isVeg: true,
                isAvailable: true,
                rating: 4.6
            }
        ];

        const storeItems = [
            {
                vendorId: campusStore._id,
                name: 'A4 Notebook',
                description: 'High quality notebook for notes',
                price: 50,
                category: 'Stationary',
                isVeg: true,
                isAvailable: true,
                rating: 4.0
            },
            {
                vendorId: campusStore._id,
                name: 'Pen Set (5pcs)',
                description: 'Blue ink pens pack of 5',
                price: 80,
                category: 'Stationary',
                isVeg: true,
                isAvailable: true,
                rating: 4.2
            },
            {
                vendorId: campusStore._id,
                name: 'Campus T-Shirt',
                description: 'Official campus merchandise',
                price: 350,
                category: 'Stationary', // Changed from 'Merchandise' to 'Stationary'
                isVeg: true,
                isAvailable: true,
                rating: 4.5
            }
        ];

        // Save all menu items
        for (const item of [...pizzaItems, ...cafeItems, ...storeItems]) {
            const menuItem = new MenuItem(item);
            await menuItem.save();
        }

        console.log('\n=== SEEDING COMPLETED ===');
        console.log('\nLogin Credentials:');
        console.log('ADMIN: admin@campus.edu / admin123');
        console.log('VENDOR (Pizza): mario@campuspizza.com / pizza123');
        console.log('VENDOR (Cafe): sarah@studyfuel.com / cafe123');
        console.log('VENDOR (Store): david@campusstore.com / store123');
        console.log('STUDENT: john@student.edu / student123');
        console.log('STUDENT: jane@student.edu / student123');

        process.exit(0);
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
};

seedDatabase();