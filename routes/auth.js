const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET Login Page
router.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('auth/login', {
        title: 'Login - Campus Delivery',
        layout: 'auth'
    });
});

// GET Signup Page
router.get('/signup', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('auth/signup', {
        title: 'Sign Up - Campus Delivery',
        layout: 'auth'
    });
});

// POST Signup
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password, confirmPassword, mobile, address, role } = req.body;

        // Validation
        if (!name || !email || !password || !mobile || !address || !role) {
            req.flash('error', 'All fields are required');
            return res.redirect('/signup');
        }

        if (password !== confirmPassword) {
            req.flash('error', 'Passwords do not match');
            return res.redirect('/signup');
        }

        if (password.length < 6) {
            req.flash('error', 'Password must be at least 6 characters');
            return res.redirect('/signup');
        }

        if (!/^[0-9]{10}$/.test(mobile)) {
            req.flash('error', 'Please enter a valid 10-digit mobile number');
            return res.redirect('/signup');
        }

        if (address.length < 10) {
            req.flash('error', 'Please enter a complete address');
            return res.redirect('/signup');
        }

        // Check if user already exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            req.flash('error', 'User with this email already exists');
            return res.redirect('/signup');
        }

        // Create new user
        const newUser = new User({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password,
            mobile: mobile.trim(),
            address: address.trim(),
            role
        });

        await newUser.save();

        // Create session
        req.session.user = {
            id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            mobile: newUser.mobile,
            address: newUser.address,
            role: newUser.role
        };

        req.flash('success', 'Account created successfully! Welcome to Campus Delivery!');

        // Redirect based on role
        if (role === 'vendor') {
            res.redirect('/dashboard/vendor');
        } else if (role === 'admin') {
            res.redirect('/dashboard/admin');
        } else {
            res.redirect('/dashboard/student');
        }

    } catch (error) {
        console.error('Signup error:', error);

        // Handle specific MongoDB errors
        if (error.code === 11000) {
            req.flash('error', 'User with this email already exists');
        } else if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            req.flash('error', messages.join(', '));
        } else {
            req.flash('error', 'Error creating account. Please try again.');
        }

        res.redirect('/signup');
    }
});

// POST Login
router.post('/login', async (req, res) => {
    try {
        const { email, password, remember } = req.body;

        // Validation
        if (!email || !password) {
            req.flash('error', 'Email and password are required');
            return res.redirect('/login');
        }

        // Find user by email
        const user = await User.findByEmail(email);
        if (!user) {
            req.flash('error', 'Invalid email or password');
            return res.redirect('/login');
        }

        // Check if user is active
        if (!user.isActive) {
            req.flash('error', 'Your account has been deactivated. Please contact support.');
            return res.redirect('/login');
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            req.flash('error', 'Invalid email or password');
            return res.redirect('/login');
        }

        // Update last login
        await user.updateLastLogin();

        // Create session
        req.session.user = {
            id: user._id,
            name: user.name,
            email: user.email,
            mobile: user.mobile,
            address: user.address,
            role: user.role
        };

        // Set session duration based on remember me
        if (remember) {
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        } else {
            req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 24 hours
        }

        req.flash('success', `Welcome back, ${user.name}!`);

        // Redirect based on role
        if (user.role === 'vendor') {
            res.redirect('/dashboard/vendor');
        } else if (user.role === 'admin') {
            res.redirect('/dashboard/admin');
        } else {
            res.redirect('/dashboard/student');
        }

    } catch (error) {
        console.error('Login error:', error);
        req.flash('error', 'Error during login. Please try again.');
        res.redirect('/login');
    }
});

// GET Logout
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.redirect('/dashboard');
        }
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
});

// GET Forgot Password
router.get('/forgot-password', (req, res) => {
    res.render('auth/forgot-password', {
        title: 'Forgot Password - Campus Delivery',
        layout: 'auth'
    });
});

// POST Forgot Password
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            req.flash('error', 'Email is required');
            return res.redirect('/auth/forgot-password');
        }

        const user = await User.findByEmail(email);
        if (!user) {
            // Don't reveal if email exists or not for security
            req.flash('success', 'If an account with that email exists, we\'ve sent password reset instructions.');
            return res.redirect('/auth/forgot-password');
        }

        // TODO: Implement email sending logic here
        // For now, just show success message
        req.flash('success', 'Password reset instructions have been sent to your email.');
        res.redirect('/login');

    } catch (error) {
        console.error('Forgot password error:', error);
        req.flash('error', 'Error processing request. Please try again.');
        res.redirect('/auth/forgot-password');
    }
});

// Demo account creation (for development)
router.post('/create-demo-accounts', async (req, res) => {
    try {
        // Only allow in development
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({ error: 'Not allowed in production' });
        }

        // Create demo student
        const demoStudent = new User({
            name: 'Demo Student',
            email: 'student@demo.com',
            password: 'password123',
            mobile: '9876543210',
            address: 'Room 101, Hostel A, University Campus',
            role: 'student'
        });

        // Create demo vendor
        const demoVendor = new User({
            name: 'Demo Vendor',
            email: 'vendor@demo.com',
            password: 'password123',
            mobile: '9876543211',
            address: 'Shop 12, Food Court, University Campus',
            role: 'vendor'
        });

        await demoStudent.save();
        await demoVendor.save();

        res.json({ message: 'Demo accounts created successfully' });

    } catch (error) {
        console.error('Demo account creation error:', error);
        res.status(500).json({ error: 'Error creating demo accounts' });
    }
});

module.exports = router;