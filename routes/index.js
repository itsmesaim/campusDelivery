const express = require('express');
const router = express.Router();

// GET / - Home page (redirect based on auth status)
router.get('/', (req, res) => {
    if (req.session.user) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/auth/login');
    }
});

module.exports = router;