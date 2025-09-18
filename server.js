const express = require('express');
const { engine } = require('express-handlebars');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const flash = require('express-flash');
const methodOverride = require('method-override');
const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const Order = require('./models/Order');
const Vendor = require('./models/Vendor');
const MenuItem = require('./models/MenuItem');

// Load environment variables
dotenv.config();

const app = express();

// Import User model
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB!'))
    .catch(err => console.error('MongoDB connection error:', err));

// Handlebars setup
app.engine('hbs', engine({
    extname: '.hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views/layouts'),
    partialsDir: path.join(__dirname, 'views/partials'),
    runtimeOptions: {
        allowProtoPropertiesByDefault: true,
        allowProtoMethodsByDefault: true
    },
    helpers: {
        eq: (a, b) => a === b,
        formatDate: (date) => {
            if (!date) return '';
            return new Date(date).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        },
        formatCurrency: (amount) => {
            if (!amount || isNaN(amount)) return '0';
            return new Intl.NumberFormat('en-IN').format(amount);
        },
        timeAgo: (date) => {
            if (!date) return '';
            const now = new Date();
            const diffMs = now - new Date(date);
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffMins < 1) return 'just now';
            if (diffMins < 60) return `${diffMins} minutes ago`;
            if (diffHours < 24) return `${diffHours} hours ago`;
            return `${diffDays} days ago`;
        }
    }
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'campus-delivery-secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI
    }),
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
}));

app.use(flash());

// Global template variables
app.use((req, res, next) => {
    res.locals.user = req.session.user;
    res.locals.messages = req.flash();
    next();
});

// Routes
// Home route
app.get('/', (req, res) => {
    if (req.session.user) {
        switch (req.session.user.role) {
            case 'student':
                return res.redirect('/dashboard/student');
            case 'vendor':
                return res.redirect('/dashboard/vendor');
            case 'admin':
                return res.redirect('/dashboard/admin');
            default:
                return res.redirect('/auth/login');
        }
    } else {
        res.redirect('/auth/login');
    }
});

// Redirect shortcuts for convenience
app.get('/signup', (req, res) => {
    res.redirect('/auth/signup');
});

app.get('/login', (req, res) => {
    res.redirect('/auth/login');
});

app.get('/logout', (req, res) => {
    res.redirect('/auth/logout');
});

// Auth GET routes
app.get('/auth/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/');
    }
    res.render('auth/login', {
        title: 'Login - Campus Delivery',
        authPage: true
    });
});

app.get('/auth/signup', (req, res) => {
    if (req.session.user) {
        return res.redirect('/');
    }
    res.render('auth/signup', {
        title: 'Sign Up - Campus Delivery',
        authPage: true
    });
});

// Auth POST routes
app.post('/auth/signup', async (req, res) => {
    try {
        console.log('Signup form submitted:', req.body);

        const { name, email, mobile, address, password, confirmPassword, role } = req.body;

        // Validate input
        if (!name || !email || !mobile || !address || !password || !confirmPassword) {
            console.log('Missing fields');
            req.flash('error', 'Please fill in all fields');
            return res.redirect('/auth/signup');
        }

        if (password !== confirmPassword) {
            console.log('Passwords do not match');
            req.flash('error', 'Passwords do not match');
            return res.redirect('/auth/signup');
        }

        if (password.length < 6) {
            console.log('Password too short');
            req.flash('error', 'Password must be at least 6 characters');
            return res.redirect('/auth/signup');
        }

        // Validate mobile number
        if (!/^[0-9]{10}$/.test(mobile)) {
            console.log('Invalid mobile number');
            req.flash('error', 'Please enter a valid 10-digit mobile number');
            return res.redirect('/auth/signup');
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log('Email already exists');
            req.flash('error', 'Email already registered');
            return res.redirect('/auth/signup');
        }

        // Check if mobile already exists
        const existingMobile = await User.findOne({ mobile });
        if (existingMobile) {
            console.log('Mobile already exists');
            req.flash('error', 'Mobile number already registered');
            return res.redirect('/auth/signup');
        }

        console.log('Creating new user...');

        // Create new user
        const user = new User({
            name,
            email,
            mobile,
            address,
            password,
            role: role || 'student' // Default to student if role not provided
        });

        await user.save();
        console.log('User created successfully');

        // Store user in session
        req.session.user = {
            id: user._id,
            name: user.name,
            email: user.email,
            mobile: user.mobile,
            address: user.address,
            role: user.role
        };

        req.flash('success', `Welcome to Campus Delivery, ${user.name}!`);
        res.redirect('/');

    } catch (error) {
        console.error('Signup error:', error);
        req.flash('error', 'Something went wrong. Please try again.');
        res.redirect('/auth/signup');
    }
});

app.post('/auth/login', async (req, res) => {
    try {
        console.log('Login form submitted:', req.body);

        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            req.flash('error', 'Please fill in all fields');
            return res.redirect('/auth/login');
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            req.flash('error', 'Invalid email or password');
            return res.redirect('/auth/login');
        }

        // Check password
        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
            req.flash('error', 'Invalid email or password');
            return res.redirect('/auth/login');
        }

        // Check if user is active
        if (!user.isActive) {
            req.flash('error', 'Account is deactivated');
            return res.redirect('/auth/login');
        }

        // Store user in session
        req.session.user = {
            id: user._id,
            name: user.name,
            email: user.email,
            mobile: user.mobile,
            address: user.address,
            role: user.role
        };

        req.flash('success', `Welcome back, ${user.name}!`);
        res.redirect('/');

    } catch (error) {
        console.error('Login error:', error);
        req.flash('error', 'Something went wrong. Please try again.');
        res.redirect('/auth/login');
    }
});

app.get('/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            req.flash('error', 'Could not log out. Please try again.');
            return res.redirect('/');
        }
        res.redirect('/auth/login');
    });
});

app.post('/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            req.flash('error', 'Could not log out. Please try again.');
            return res.redirect('/');
        }
        res.redirect('/auth/login');
    });
});

// Dashboard routes
app.get('/dashboard/student', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.role !== 'student') {
            req.flash('error', 'Access denied');
            return res.redirect('/auth/login');
        }

        // Get vendors and their menu items
        const vendors = await Vendor.find({ isActive: true }).sort({ rating: -1 });

        // Get menu items for each vendor
        const vendorsWithMenus = await Promise.all(
            vendors.map(async (vendor) => {
                const menuItems = await MenuItem.find({
                    vendorId: vendor._id,
                    isAvailable: true
                }).limit(3); // Show only 3 items per vendor for preview

                return {
                    ...vendor.toObject(),
                    menuItems
                };
            })
        );

        // Get featured vendors (top rated ones)
        const featuredVendors = vendorsWithMenus
            .filter(v => v.rating >= 4.5)
            .slice(0, 2);

        // Get user's recent orders
        const recentOrders = await Order.find({
            userId: req.session.user.id,
            status: { $ne: 'CART' }
        })
            .populate('vendorId', 'name cuisine')
            .sort({ createdAt: -1 })
            .limit(3);

        res.render('dashboard/student', {
            title: 'Student Dashboard - Campus Delivery',
            dashboardPage: true,
            vendors: vendorsWithMenus,
            featuredVendors,
            recentOrders
        });

    } catch (error) {
        console.error('Student dashboard error:', error);
        req.flash('error', 'Failed to load dashboard data');
        res.redirect('/auth/login');
    }
});

app.get('/dashboard/vendor', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'vendor') {
        req.flash('error', 'Access denied');
        return res.redirect('/auth/login');
    }
    res.render('dashboard/vendor', {
        title: 'Vendor Dashboard - Campus Delivery',
        dashboardPage: true
    });
});

app.get('/dashboard/admin', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.role !== 'admin') {
            req.flash('error', 'Access denied');
            return res.redirect('/auth/login');
        }

        // Get current date for today's stats
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

        // Get statistics
        const stats = await Promise.all([
            // Total users count
            User.countDocuments({}),

            // Active vendors count
            Vendor.countDocuments({ isActive: true }),

            // Today's orders count
            Order.countDocuments({
                createdAt: { $gte: startOfDay, $lt: endOfDay },
                status: { $ne: 'CART' }
            }),

            // Today's GMV (Gross Merchandise Value)
            Order.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startOfDay, $lt: endOfDay },
                        status: { $ne: 'CART' }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalGMV: { $sum: '$total' }
                    }
                }
            ]),

            // Recent orders for activity feed
            Order.find({ status: { $ne: 'CART' } })
                .populate('userId', 'name')
                .populate('vendorId', 'name')
                .sort({ createdAt: -1 })
                .limit(5),

            // Recent user registrations
            User.find({ role: 'student' })
                .sort({ createdAt: -1 })
                .limit(3),

            // Vendor status summary
            Vendor.aggregate([
                {
                    $group: {
                        _id: '$isOnline',
                        count: { $sum: 1 }
                    }
                }
            ])
        ]);

        const [
            totalUsers,
            activeVendors,
            todaysOrders,
            gmvResult,
            recentOrders,
            recentUsers,
            vendorStatus
        ] = stats;

        const todaysGMV = gmvResult.length > 0 ? gmvResult[0].totalGMV : 0;

        // Process vendor status
        const onlineVendors = vendorStatus.find(v => v._id === true)?.count || 0;
        const offlineVendors = vendorStatus.find(v => v._id === false)?.count || 0;

        // Create activity feed
        const activities = [];

        // Add recent orders to activity
        recentOrders.forEach(order => {
            activities.push({
                type: 'order',
                icon: '📦',
                title: 'Order ' + (order.status === 'DELIVERED' ? 'completed' : 'placed'),
                description: `${order.userId?.name || 'Unknown'} ordered from ${order.vendorId?.name || 'Unknown vendor'}`,
                time: order.createdAt,
                amount: order.total
            });
        });

        // Add recent registrations to activity
        recentUsers.forEach(user => {
            activities.push({
                type: 'user',
                icon: '👤',
                title: 'New user registration',
                description: `${user.name} joined as ${user.role}`,
                time: user.createdAt
            });
        });

        // Sort activities by time (most recent first)
        activities.sort((a, b) => new Date(b.time) - new Date(a.time));

        res.render('dashboard/admin', {
            title: 'Admin Dashboard - Campus Delivery',
            dashboardPage: true,
            stats: {
                totalUsers,
                activeVendors,
                todaysOrders,
                todaysGMV,
                onlineVendors,
                offlineVendors
            },
            activities: activities.slice(0, 5) // Show only 5 most recent
        });

    } catch (error) {
        console.error('Admin dashboard error:', error);
        req.flash('error', 'Failed to load dashboard data');
        res.redirect('/auth/login');
    }
});

// Student profile and orders routes
app.get('/dashboard/student/profile', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.role !== 'student') {
            req.flash('error', 'Access denied');
            return res.redirect('/auth/login');
        }

        const user = await User.findById(req.session.user.id);

        res.render('dashboard/student-profile', {
            title: 'My Profile - Campus Delivery',
            user: user,
            dashboardPage: true
        });

    } catch (error) {
        console.error('Profile error:', error);
        req.flash('error', 'Failed to load profile');
        res.redirect('/dashboard/student');
    }
});

// Replace your existing /dashboard/student/orders route with this:
app.get('/dashboard/student/orders', async (req, res) => {
    try {
        console.log('=== ORDERS LISTING DEBUG ===');
        console.log('User ID:', req.session.user.id);

        if (!req.session.user || req.session.user.role !== 'student') {
            req.flash('error', 'Access denied');
            return res.redirect('/auth/login');
        }

        // First, let's check ALL orders in the database
        const allOrders = await Order.find({});
        console.log('Total orders in database:', allOrders.length);

        // Check orders for this user specifically
        const userOrders = await Order.find({ userId: req.session.user.id });
        console.log('Orders for this user (any status):', userOrders.length);

        // Check orders excluding CART status
        const orders = await Order.find({
            userId: req.session.user.id,
            status: { $ne: 'CART' }
        })
            .populate('vendorId', 'name cuisine')
            .sort({ createdAt: -1 });

        console.log('Orders excluding CART:', orders.length);
        console.log('Orders data:', orders);

        res.render('dashboard/student-orders', {
            title: 'My Orders - Campus Delivery',
            orders: orders,
            dashboardPage: true
        });

    } catch (error) {
        console.error('=== ORDERS LISTING ERROR ===');
        console.error('Error details:', error);
        req.flash('error', 'Failed to load orders');
        res.redirect('/dashboard/student');
    }
});

// Add this route to create test data
app.get('/create-test-data', async (req, res) => {
    try {
        // Check if data already exists
        const existingVendors = await Vendor.countDocuments();
        if (existingVendors > 0) {
            return res.json({ message: 'Test data already exists' });
        }

        // Create test vendors
        const vendor1 = new Vendor({
            name: "Mario's Pizza Corner",
            description: "Authentic Italian pizzas with fresh ingredients",
            cuisine: "Pizza",
            deliveryTime: "15-25 min",
            isActive: true,
            isOnline: true,
            rating: 4.8
        });
        await vendor1.save();

        const vendor2 = new Vendor({
            name: "Campus Coffee",
            description: "Fresh coffee and snacks for students",
            cuisine: "Coffee",
            deliveryTime: "5-10 min",
            isActive: true,
            isOnline: true,
            rating: 4.5
        });
        await vendor2.save();

        // Create menu items for Pizza vendor
        const menuItems1 = [
            new MenuItem({
                vendorId: vendor1._id,
                name: "Margherita Pizza",
                description: "Classic tomato, mozzarella, and basil",
                price: 299,
                category: "Pizza",
                isAvailable: true
            }),
            new MenuItem({
                vendorId: vendor1._id,
                name: "Pepperoni Pizza",
                description: "Spicy pepperoni with cheese",
                price: 399,
                category: "Pizza",
                isAvailable: true
            }),
            new MenuItem({
                vendorId: vendor1._id,
                name: "Garlic Bread",
                description: "Crispy bread with garlic butter",
                price: 149,
                category: "Pizza",
                isAvailable: true
            })
        ];

        // Create menu items for Coffee vendor
        const menuItems2 = [
            new MenuItem({
                vendorId: vendor2._id,
                name: "Cappuccino",
                description: "Rich espresso with steamed milk",
                price: 89,
                category: "Coffee",
                isAvailable: true
            }),
            new MenuItem({
                vendorId: vendor2._id,
                name: "Sandwich",
                description: "Grilled chicken sandwich",
                price: 179,
                category: "Coffee",
                isAvailable: true
            })
        ];

        // Save all menu items
        await MenuItem.insertMany([...menuItems1, ...menuItems2]);

        res.json({
            message: 'Test data created successfully!',
            vendors: 2,
            menuItems: 5
        });

    } catch (error) {
        console.error('Error creating test data:', error);
        res.status(500).json({ error: 'Failed to create test data' });
    }
});

// Add this route to your server.js

// Toggle vendor online/offline status
app.post('/vendor/toggle-status', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.role !== 'vendor') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        // Find vendor by the user's email
        const vendor = await Vendor.findOne({ ownerEmail: req.session.user.email });
        if (!vendor) {
            return res.status(404).json({ success: false, message: 'Vendor profile not found' });
        }

        // Toggle the online status
        vendor.isOnline = !vendor.isOnline;
        await vendor.save();

        console.log(`Vendor ${vendor.name} is now ${vendor.isOnline ? 'online' : 'offline'}`);

        res.json({
            success: true,
            message: `You are now ${vendor.isOnline ? 'online and accepting orders' : 'offline'}`,
            isOnline: vendor.isOnline
        });

    } catch (error) {
        console.error('Toggle vendor status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update status. Please try again.'
        });
    }
});

// Add these routes to your server.js

// ==================== VENDOR MENU MANAGEMENT ROUTES ====================

// Get vendor menu page
app.get('/dashboard/vendor/menu', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.role !== 'vendor') {
            req.flash('error', 'Access denied');
            return res.redirect('/auth/login');
        }

        const vendor = await Vendor.findOne({ ownerEmail: req.session.user.email });
        if (!vendor) {
            req.flash('error', 'Vendor profile not found');
            return res.redirect('/auth/login');
        }

        const menuItems = await MenuItem.find({ vendorId: vendor._id }).sort({ createdAt: -1 });

        res.render('dashboard/vendor-menu', {
            title: 'Menu Management - Campus Delivery',
            menuItems: menuItems,
            vendor: vendor,
            dashboardPage: true
        });

    } catch (error) {
        console.error('Vendor menu error:', error);
        req.flash('error', 'Failed to load menu');
        res.redirect('/dashboard/vendor');
    }
});

// Add new menu item
app.post('/vendor/menu/add', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.role !== 'vendor') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const vendor = await Vendor.findOne({ ownerEmail: req.session.user.email });
        if (!vendor) {
            return res.status(404).json({ success: false, message: 'Vendor not found' });
        }

        const { name, description, price, category, preparationTime, isVeg, isAvailable } = req.body;

        const menuItem = new MenuItem({
            vendorId: vendor._id,
            name: name.trim(),
            description: description.trim(),
            price: parseFloat(price),
            category,
            preparationTime: preparationTime || '10-15 min',
            isVeg: isVeg === 'true',
            isAvailable: isAvailable === 'on'
        });

        await menuItem.save();

        res.json({ success: true, message: 'Menu item added successfully!' });

    } catch (error) {
        console.error('Add menu item error:', error);
        res.status(500).json({ success: false, message: 'Failed to add menu item' });
    }
});

// Edit menu item
app.post('/vendor/menu/edit', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.role !== 'vendor') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const vendor = await Vendor.findOne({ ownerEmail: req.session.user.email });
        if (!vendor) {
            return res.status(404).json({ success: false, message: 'Vendor not found' });
        }

        const { itemId, name, description, price, category, preparationTime, isVeg, isAvailable } = req.body;

        const menuItem = await MenuItem.findOne({ _id: itemId, vendorId: vendor._id });
        if (!menuItem) {
            return res.status(404).json({ success: false, message: 'Menu item not found' });
        }

        menuItem.name = name.trim();
        menuItem.description = description.trim();
        menuItem.price = parseFloat(price);
        menuItem.category = category;
        menuItem.preparationTime = preparationTime || '10-15 min';
        menuItem.isVeg = isVeg === 'true';
        menuItem.isAvailable = isAvailable === 'on';

        await menuItem.save();

        res.json({ success: true, message: 'Menu item updated successfully!' });

    } catch (error) {
        console.error('Edit menu item error:', error);
        res.status(500).json({ success: false, message: 'Failed to update menu item' });
    }
});

// Toggle menu item availability
app.post('/vendor/menu/:id/toggle', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.role !== 'vendor') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const vendor = await Vendor.findOne({ ownerEmail: req.session.user.email });
        if (!vendor) {
            return res.status(404).json({ success: false, message: 'Vendor not found' });
        }

        const menuItem = await MenuItem.findOne({ _id: req.params.id, vendorId: vendor._id });
        if (!menuItem) {
            return res.status(404).json({ success: false, message: 'Menu item not found' });
        }

        menuItem.isAvailable = !menuItem.isAvailable;
        await menuItem.save();

        res.json({
            success: true,
            message: `Item ${menuItem.isAvailable ? 'enabled' : 'disabled'}`,
            isAvailable: menuItem.isAvailable
        });

    } catch (error) {
        console.error('Toggle menu item error:', error);
        res.status(500).json({ success: false, message: 'Failed to update item status' });
    }
});

// Delete menu item
app.delete('/vendor/menu/:id/delete', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.role !== 'vendor') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const vendor = await Vendor.findOne({ ownerEmail: req.session.user.email });
        if (!vendor) {
            return res.status(404).json({ success: false, message: 'Vendor not found' });
        }

        const menuItem = await MenuItem.findOneAndDelete({ _id: req.params.id, vendorId: vendor._id });
        if (!menuItem) {
            return res.status(404).json({ success: false, message: 'Menu item not found' });
        }

        res.json({ success: true, message: 'Menu item deleted successfully!' });

    } catch (error) {
        console.error('Delete menu item error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete menu item' });
    }
});

// ==================== VENDOR PROFILE MANAGEMENT ROUTES ====================

// Get vendor profile page
app.get('/dashboard/vendor/profile', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.role !== 'vendor') {
            req.flash('error', 'Access denied');
            return res.redirect('/auth/login');
        }

        const vendor = await Vendor.findOne({ ownerEmail: req.session.user.email });
        if (!vendor) {
            req.flash('error', 'Vendor profile not found');
            return res.redirect('/auth/login');
        }

        // Get some basic stats
        const [totalOrders, totalRevenue, menuItemsCount] = await Promise.all([
            Order.countDocuments({ vendorId: vendor._id, status: { $ne: 'CART' } }),
            Order.aggregate([
                { $match: { vendorId: vendor._id, status: 'DELIVERED' } },
                { $group: { _id: null, total: { $sum: '$total' } } }
            ]),
            MenuItem.countDocuments({ vendorId: vendor._id })
        ]);

        const stats = {
            totalOrders,
            totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
            menuItemsCount
        };

        res.render('dashboard/vendor-profile', {
            title: 'Business Profile - Campus Delivery',
            vendor: vendor,
            user: req.session.user,
            stats: stats,
            dashboardPage: true
        });

    } catch (error) {
        console.error('Vendor profile error:', error);
        req.flash('error', 'Failed to load profile');
        res.redirect('/dashboard/vendor');
    }
});

// Update vendor profile
app.post('/vendor/profile/update', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.role !== 'vendor') {
            req.flash('error', 'Access denied');
            return res.redirect('/auth/login');
        }

        const { name, description, cuisine, deliveryTime, ownerName, mobile, address, isActive, isOnline } = req.body;

        // Update vendor information
        const vendor = await Vendor.findOne({ ownerEmail: req.session.user.email });
        if (!vendor) {
            req.flash('error', 'Vendor profile not found');
            return res.redirect('/dashboard/vendor/profile');
        }

        vendor.name = name.trim();
        vendor.description = description.trim();
        vendor.cuisine = cuisine;
        vendor.deliveryTime = deliveryTime || '15-25 min';
        vendor.isActive = isActive === 'on';
        vendor.isOnline = isOnline === 'on';
        await vendor.save();

        // Update user information
        const user = await User.findById(req.session.user.id);
        if (user) {
            user.name = ownerName.trim();
            user.mobile = mobile.trim();
            user.address = address.trim();
            await user.save();

            // Update session
            req.session.user.name = user.name;
            req.session.user.mobile = user.mobile;
            req.session.user.address = user.address;
        }

        req.flash('success', 'Profile updated successfully!');
        res.redirect('/dashboard/vendor/profile');

    } catch (error) {
        console.error('Update vendor profile error:', error);
        req.flash('error', 'Failed to update profile');
        res.redirect('/dashboard/vendor/profile');
    }
});

// ==================== VENDOR ANALYTICS ROUTES ====================

// Get vendor analytics page
app.get('/dashboard/vendor/analytics', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.role !== 'vendor') {
            req.flash('error', 'Access denied');
            return res.redirect('/auth/login');
        }

        const vendor = await Vendor.findOne({ ownerEmail: req.session.user.email });
        if (!vendor) {
            req.flash('error', 'Vendor profile not found');
            return res.redirect('/auth/login');
        }

        // Get analytics data
        const [
            totalRevenue,
            totalOrders,
            uniqueCustomers,
            topItems
        ] = await Promise.all([
            // Total revenue
            Order.aggregate([
                { $match: { vendorId: vendor._id, status: 'DELIVERED' } },
                { $group: { _id: null, total: { $sum: '$total' } } }
            ]),

            // Total orders
            Order.countDocuments({ vendorId: vendor._id, status: { $ne: 'CART' } }),

            // Unique customers
            Order.distinct('userId', { vendorId: vendor._id, status: { $ne: 'CART' } }),

            // Top selling items
            Order.aggregate([
                { $match: { vendorId: vendor._id, status: 'DELIVERED' } },
                { $unwind: '$items' },
                {
                    $group: {
                        _id: '$items.name',
                        orderCount: { $sum: '$items.quantity' },
                        revenue: { $sum: '$items.total' }
                    }
                },
                { $sort: { orderCount: -1 } },
                { $limit: 5 },
                {
                    $project: {
                        name: '$_id',
                        orderCount: 1,
                        revenue: 1,
                        rating: { $literal: 4.5 }, // Mock rating
                        category: { $literal: 'Food' } // Mock category
                    }
                }
            ])
        ]);

        const analytics = {
            totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
            totalOrders,
            averageRating: vendor.rating,
            uniqueCustomers: uniqueCustomers.length,
            topItems: topItems,
            recentReviews: [] // Mock empty reviews for now
        };

        res.render('dashboard/vendor-analytics', {
            title: 'Business Analytics - Campus Delivery',
            vendor: vendor,
            analytics: analytics,
            dashboardPage: true
        });

    } catch (error) {
        console.error('Vendor analytics error:', error);
        req.flash('error', 'Failed to load analytics');
        res.redirect('/dashboard/vendor');
    }
});

// Admin routes
app.get('/admin/vendors/new', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        req.flash('error', 'Access denied');
        return res.redirect('/auth/login');
    }

    res.render('admin/create-vendor', {
        title: 'Create New Vendor - Campus Delivery',
        dashboardPage: true
    });
});

app.post('/admin/vendors/create', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.role !== 'admin') {
            req.flash('error', 'Access denied');
            return res.redirect('/auth/login');
        }

        const {
            ownerName,
            ownerEmail,
            ownerPassword,
            ownerMobile,
            vendorName,
            description,
            cuisine,
            deliveryTime
        } = req.body;

        // Validate input
        if (!ownerName || !ownerEmail || !ownerPassword || !ownerMobile || !vendorName || !description || !cuisine) {
            req.flash('error', 'All fields are required');
            return res.redirect('/admin/vendors/new');
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email: ownerEmail });
        if (existingUser) {
            req.flash('error', 'Email already registered');
            return res.redirect('/admin/vendors/new');
        }

        // Create vendor owner user
        const vendorOwner = new User({
            name: ownerName,
            email: ownerEmail,
            password: ownerPassword,
            mobile: ownerMobile,
            address: 'Campus Vendor', // Default address
            role: 'vendor'
        });
        await vendorOwner.save();

        // Create vendor
        const vendor = new Vendor({
            name: vendorName,
            description: description,
            cuisine: cuisine,
            deliveryTime: deliveryTime || '15-25 min',
            isActive: true,
            isOnline: false, // Vendor can activate when ready
            rating: 4.0 // Default rating
        });
        await vendor.save();

        req.flash('success', `Vendor "${vendorName}" created successfully! Login: ${ownerEmail} / ${ownerPassword}`);
        res.redirect('/admin/vendors');

    } catch (error) {
        console.error('Create vendor error:', error);
        req.flash('error', 'Failed to create vendor');
        res.redirect('/admin/vendors/new');
    }
});

app.get('/admin/vendors', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.role !== 'admin') {
            req.flash('error', 'Access denied');
            return res.redirect('/auth/login');
        }

        const vendors = await Vendor.find({}).sort({ createdAt: -1 });

        res.render('admin/vendors-list', {
            title: 'Manage Vendors - Campus Delivery',
            vendors,
            dashboardPage: true
        });

    } catch (error) {
        console.error('Vendors list error:', error);
        req.flash('error', 'Failed to load vendors');
        res.redirect('/dashboard/admin');
    }
});

app.post('/admin/vendors/:id/toggle', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.role !== 'admin') {
            req.flash('error', 'Access denied');
            return res.redirect('/auth/login');
        }

        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) {
            req.flash('error', 'Vendor not found');
            return res.redirect('/admin/vendors');
        }

        vendor.isActive = !vendor.isActive;
        await vendor.save();

        req.flash('success', `Vendor ${vendor.isActive ? 'activated' : 'deactivated'} successfully`);
        res.redirect('/admin/vendors');

    } catch (error) {
        console.error('Toggle vendor error:', error);
        req.flash('error', 'Failed to update vendor status');
        res.redirect('/admin/vendors');
    }
});

app.get('/admin/users', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.role !== 'admin') {
            req.flash('error', 'Access denied');
            return res.redirect('/auth/login');
        }

        const users = await User.find({}).sort({ createdAt: -1 });

        res.render('admin/users-list', {
            title: 'Manage Users - Campus Delivery',
            users,
            dashboardPage: true
        });

    } catch (error) {
        console.error('Users list error:', error);
        req.flash('error', 'Failed to load users');
        res.redirect('/dashboard/admin');
    }
});

app.get('/admin/orders', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.role !== 'admin') {
            req.flash('error', 'Access denied');
            return res.redirect('/auth/login');
        }

        const orders = await Order.find({ status: { $ne: 'CART' } })
            .populate('userId', 'name email')
            .populate('vendorId', 'name')
            .sort({ createdAt: -1 })
            .limit(50);

        res.render('admin/orders-list', {
            title: 'Manage Orders - Campus Delivery',
            orders,
            dashboardPage: true
        });

    } catch (error) {
        console.error('Orders list error:', error);
        req.flash('error', 'Failed to load orders');
        res.redirect('/dashboard/admin');
    }
});

// Replace your existing /orders/place route with this debug version:
app.post('/orders/place', async (req, res) => {
    try {
        console.log('=== ORDER PLACEMENT DEBUG ===');
        console.log('User:', req.session.user);
        console.log('Request body:', req.body);

        if (!req.session.user) {
            req.flash('error', 'Please login to place an order');
            return res.redirect('/auth/login');
        }

        const { deliveryAddress, phone, paymentMethod, notes, cartData } = req.body;

        if (!cartData) {
            console.log('ERROR: No cart data');
            req.flash('error', 'Your cart is empty');
            return res.redirect('/dashboard/student');
        }

        const orderData = JSON.parse(cartData);
        console.log('Parsed cart data:', orderData);

        if (!orderData.items || orderData.items.length === 0) {
            console.log('ERROR: No items in cart');
            req.flash('error', 'Your cart is empty');
            return res.redirect('/dashboard/student');
        }

        // Create order items from cart data
        const orderItems = orderData.items.map(item => ({
            menuItemId: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            total: item.total
        }));

        console.log('Order items:', orderItems);

        // Create order
        const order = new Order({
            userId: req.session.user.id,
            vendorId: orderData.vendorId,
            items: orderItems,
            deliveryAddress: deliveryAddress || req.session.user.address,
            phone: phone || req.session.user.mobile,
            subtotal: orderData.subtotal,
            deliveryFee: orderData.deliveryFee || 20,
            total: orderData.total,
            paymentMethod: paymentMethod || 'COD',
            notes: notes || '',
            status: 'PLACED'
        });

        console.log('Order before save:', order);

        const savedOrder = await order.save();
        console.log('Order saved successfully:', savedOrder);

        req.flash('success', `Order placed successfully! Order #${savedOrder.orderNumber} - Total: ₹${orderData.total}`);
        res.redirect('/orders/track/' + savedOrder._id);

    } catch (error) {
        console.error('=== ORDER PLACEMENT ERROR ===');
        console.error('Error details:', error);
        req.flash('error', 'Failed to place order. Please try again.');
        res.redirect('/dashboard/student');
    }
});
app.get('/orders/track/:orderId', async (req, res) => {
    try {
        if (!req.session.user) {
            req.flash('error', 'Please login to view orders');
            return res.redirect('/auth/login');
        }

        const order = await Order.findById(req.params.orderId)
            .populate('vendorId', 'name')
            .populate('userId', 'name email');

        if (!order) {
            req.flash('error', 'Order not found');
            return res.redirect('/dashboard/student');
        }

        // Check if user owns this order (or is admin)
        if (order.userId._id.toString() !== req.session.user.id && req.session.user.role !== 'admin') {
            req.flash('error', 'Access denied');
            return res.redirect('/dashboard/student');
        }

        res.render('orders/track', {
            title: 'Track Order - Campus Delivery',
            order,
            dashboardPage: true
        });

    } catch (error) {
        console.error('Track order error:', error);
        req.flash('error', 'Failed to load order details');
        res.redirect('/dashboard/student');
    }
});

app.get('/orders/mine', async (req, res) => {
    try {
        if (!req.session.user) {
            req.flash('error', 'Please login to view orders');
            return res.redirect('/auth/login');
        }

        const orders = await Order.find({
            userId: req.session.user.id,
            status: { $ne: 'CART' }
        })
            .populate('vendorId', 'name')
            .sort({ createdAt: -1 });

        res.render('orders/my-orders', {
            title: 'My Orders - Campus Delivery',
            orders,
            dashboardPage: true
        });

    } catch (error) {
        console.error('My orders error:', error);
        req.flash('error', 'Failed to load orders');
        res.redirect('/dashboard/student');
    }
});

// 404 handler
app.use((req, res) => {
    console.log('404 - Route not found:', req.method, req.url);
    res.status(404).render('error', {
        title: '404 - Page Not Found',
        message: 'The page you are looking for does not exist.'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(err.status || 500).render('error', {
        title: '500 - Server Error',
        message: 'Something went wrong on our end.'
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Visit: http://localhost:${PORT}`);
});