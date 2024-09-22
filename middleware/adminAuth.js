const Admin = require('../model/adminModel');
const isLogin = async (req, res, next) => {
    try {
        if (req.session && req.session.admin_id) {
            return next();
        } else {
            return res.redirect('/admin/login');
        }
    } catch (error) {
        res.send(error.message);
    }
};

const isLogout = async (req, res, next) => {
    try {
        if (req.session && req.session.admin_id) {
            return res.redirect('/admin/dashboard');
        }
        return next();
    } catch (error) {
        res.send(error.message);
    }
};

module.exports = {
    isLogin,
    isLogout
};
