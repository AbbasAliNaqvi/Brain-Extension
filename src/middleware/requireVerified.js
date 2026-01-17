module.exports = (req, res, next) => {
    if(!req.user){
        return res.status(401).json({
            status: "ERROR",
            message: "Authentication required"
    });
    }
    if(!req.user.emailVerified){
        return res.status(403).json({
            status: "ACCESS_DENIED",
            message: "Email verification required to access this resource"
        });
    }
    next();
};