// Global JavaScript for Handlebars templates

document.addEventListener('DOMContentLoaded', function () {

    // Auto-hide flash messages after 5 seconds
    const flashMessages = document.querySelectorAll('.alert');
    flashMessages.forEach(function (message) {
        setTimeout(function () {
            message.style.opacity = '0';
            setTimeout(function () {
                message.remove();
            }, 300);
        }, 5000);
    });

    // Vendor status toggle
    const vendorStatusToggle = document.getElementById('vendorStatus');
    if (vendorStatusToggle) {
        vendorStatusToggle.addEventListener('change', function () {
            const statusText = this.parentElement.querySelector('.status-text');
            if (this.checked) {
                statusText.textContent = 'Store Online';
                statusText.style.color = '#38a169';
            } else {
                statusText.textContent = 'Store Offline';
                statusText.style.color = '#e53e3e';
            }

            // Here you would typically make an API call to update vendor status
            console.log('Vendor status:', this.checked ? 'online' : 'offline');
        });
    }

    // Order action buttons
    const acceptButtons = document.querySelectorAll('.btn-accept');
    acceptButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            this.textContent = 'Accepted';
            this.style.background = '#38a169';
            this.disabled = true;

            // Here you would make an API call to accept the order
            console.log('Order accepted');
        });
    });

    const readyButtons = document.querySelectorAll('.btn-ready');
    readyButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            this.textContent = 'Ready';
            this.style.background = '#38a169';
            this.disabled = true;

            // Here you would make an API call to mark order as ready
            console.log('Order marked as ready');
        });
    });

    // Form validation for signup
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', function (e) {
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (password !== confirmPassword) {
                e.preventDefault();
                alert('Passwords do not match');
                return false;
            }

            if (password.length < 6) {
                e.preventDefault();
                alert('Password must be at least 6 characters');
                return false;
            }

            const mobile = document.getElementById('mobile').value;
            if (!/^[0-9]{10}$/.test(mobile)) {
                e.preventDefault();
                alert('Please enter a valid 10-digit mobile number');
                return false;
            }
        });
    }

    // Close mobile menu when clicking on links
    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('nav-link')) {
            const navMenu = document.querySelector('.nav-menu');
            const mobileToggle = document.querySelector('.mobile-menu-toggle');

            if (navMenu) navMenu.classList.remove('mobile-open');
            if (mobileToggle) mobileToggle.classList.remove('active');
        }
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', function (e) {
        const navMenu = document.querySelector('.nav-menu');
        const mobileToggle = document.querySelector('.mobile-menu-toggle');
        const navbar = document.querySelector('.navbar');

        if (navbar && navMenu && !navbar.contains(e.target) && navMenu.classList.contains('mobile-open')) {
            navMenu.classList.remove('mobile-open');
            if (mobileToggle) mobileToggle.classList.remove('active');
        }
    });
});

// Mobile menu toggle functionality
function toggleMobileMenu() {
    const navMenu = document.querySelector('.nav-menu');
    const mobileToggle = document.querySelector('.mobile-menu-toggle');

    if (navMenu) navMenu.classList.toggle('mobile-open');
    if (mobileToggle) mobileToggle.classList.toggle('active');
}