// breadcrumbMiddleware.js
const breadcrumbMiddleware = (req, res, next) => {
    // Default breadcrumb
    res.locals.breadcrumb = [{ name: 'Home', url: '/' }];
    
    // Customize breadcrumb based on routes
    switch (req.path) {
        case '/login':
            res.locals.breadcrumb = [
                { name: 'Home', url: '/' },
                { name: 'Login', url: '/login' }
            ];
            break;
        case '/register':
            res.locals.breadcrumb = [
                { name: 'Home', url: '/' },
                { name: 'Register', url: '/register' }
            ];
            break;
        case '/profile':
            res.locals.breadcrumb = [
                { name: 'Home', url: '/' },
                { name: 'Profile', url: '/profile' }
            ];
            break;
        case '/shop':
            res.locals.breadcrumb = [
                { name: 'Home', url: '/' },
                { name: 'Shop', url: '/shop' }
            ];
            break;
        default:
            if (req.path.startsWith('/singleProduct')) {
                res.locals.breadcrumb = [
                    { name: 'Home', url: '/' },
                    { name: 'Shop', url: '/shop' },
                    { name: 'Product Details' }
                ];
            }
            break;
    }

    next();
};

module.exports = breadcrumbMiddleware;
