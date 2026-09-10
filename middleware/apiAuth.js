const User = require("../models/User");

function requireUser(req, res, next) {
    if (!req.session.user) return res.status(401).json({ message: "Please sign in to continue." });
    next();
}

function requireRole(...roles) {
    return async (req, res, next) => {
        try {
            if (!req.session.user) return res.status(401).json({ message: "Please sign in to continue." });

            const user = await User.findById(req.session.user.id);
            if (!user) {
                req.session.destroy(() => {});
                return res.status(401).json({ message: "Your session has expired. Please sign in again." });
            }

            if (!roles.includes(user.role)) {
                return res.status(403).json({ message: "Access denied for your role." });
            }

            req.currentUser = user;
            next();
        } catch (error) {
            next(error);
        }
    };
}

module.exports = { requireUser, requireRole };
