const jwt = require("jsonwebtoken");

const User = require("../models/User");

module.exports = async (req, res, next) => {
    try {
        const header = req.headers.authorization;
        if (!header)
            return res.status(401).json({
                status: "ERROR",
                message: "NO TOKEN FOUND"
            });

        const token = header.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const user = await User.findById(decoded.userId).select("-password -refreshTokens");

        if (!user)
            return res.status(401).json({
                status: "ERROR",
                message: "USER NOT FOUND"
            });

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({
            status: "ERROR",
            message: "INVALID TOKEN"
    });
}
};