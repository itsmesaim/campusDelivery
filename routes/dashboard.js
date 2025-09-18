const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /dashboard - Redirect to role-specific dashboard
router.get('/', requireAuth, (req, res) => {
    const user = req.session.user;

    switch (user.role) {
        case 'student':
            res.redirect('/dashboard/student');
            break;
        case 'vendor':
            res.redirect('/dashboard/vendor');
            break;
        case 'admin':
            res.redirect('/dashboard/admin');
            break;
        default:
            res.redirect('/dashboard/student');
    }
});

// GET /dashboard/student - Student Dashboard
router.get('/student', requireRole(['student']), (req, res) => {
    res.render('dashboard/student', {
        title: 'Student Dashboard - Campus Delivery',
        user: req.session.user,
        layout: 'main'
    });
});

// GET /dashboard/vendor - Vendor Dashboard
router.get('/vendor', requireRole(['vendor']), (req, res) => {
    res.render('dashboard/vendor', {
        title: 'Vendor Dashboard - Campus Delivery',
        user: req.session.user,
        layout: 'main'
    });
});

// GET /dashboard/admin - Admin Dashboard
router.get('/admin', requireRole(['admin']), (req, res) => {
    res.render('dashboard/admin', {
        title: 'Admin Dashboard - Campus Delivery',
        user: req.session.user,
        layout: 'main'
    });
});

module.exports = router;