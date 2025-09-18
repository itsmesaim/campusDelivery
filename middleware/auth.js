// Authentication middleware for session-based auth

// Require authentication
const requireAuth = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    req.flash('error', 'Please login to access this page');
    res.redirect('/auth/login');
};

// Require specific role
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.session.user) {
            req.flash('error', 'Please login to access this page');
            return res.redirect('/auth/login');
        }

        if (!roles.includes(req.session.user.role)) {
            req.flash('error', 'You do not have permission to access this page');
            return res.redirect('/dashboard');
        }

        next();
    };
};

// Redirect authenticated users away from guest pages
const redirectIfAuth = (req, res, next) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    next();
};

module.exports = {
    requireAuth,
    requireRole,
    redirectIfAuth
};