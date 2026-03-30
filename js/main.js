// Back to Top Button
(function () {
    var backToTop = document.getElementById('backToTop');
    if (backToTop) {
        window.addEventListener('scroll', function () {
            if (window.scrollY > 300) {
                backToTop.classList.add('show');
            } else {
                backToTop.classList.remove('show');
            }
        });
        backToTop.addEventListener('click', function (e) {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
})();

// Mobile Navigation Toggle
(function () {
    var navToggle = document.querySelector('.nav-toggle');
    var navMenu = document.querySelector('.nav-menu');
    if (!navToggle || !navMenu) return;

    navToggle.addEventListener('click', function () {
        navMenu.classList.toggle('active');
        navToggle.classList.toggle('active');
        var expanded = navMenu.classList.contains('active');
        navToggle.setAttribute('aria-expanded', expanded);
    });

    // Mobile sub-menu accordion
    document.querySelectorAll('.nav-item > a').forEach(function (link) {
        link.addEventListener('click', function (e) {
            var submenu = link.nextElementSibling;
            if (window.innerWidth <= 768 && submenu && submenu.classList.contains('sub-menu')) {
                e.preventDefault();
                var parent = link.parentElement;
                // Close other open items
                document.querySelectorAll('.nav-item.open').forEach(function (item) {
                    if (item !== parent) item.classList.remove('open');
                });
                parent.classList.toggle('open');
            }
        });
    });

    // Close menu on resize to desktop
    window.addEventListener('resize', function () {
        if (window.innerWidth > 768) {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
            navToggle.setAttribute('aria-expanded', 'false');
            document.querySelectorAll('.nav-item.open').forEach(function (item) {
                item.classList.remove('open');
            });
        }
    });
})();

// GNB Active Page Indicator
(function () {
    var currentPath = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-item').forEach(function (item) {
        var links = item.querySelectorAll('a');
        links.forEach(function (link) {
            var href = link.getAttribute('href');
            if (href === currentPath) {
                item.classList.add('active');
            }
        });
    });
})();
