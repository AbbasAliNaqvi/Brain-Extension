module.exports = (req, res, next) => {
    if (req.path === "/health") {
        return next();
    }
    const requestPin = req.headers["x-brain-pin"];
    const masterPin = process.env.BRAIN_PIN;

    if (!requestPin || requestPin !== masterPin) {
        console.warn(`[Shield] Blocked unauthorized access from IP: ${req.ip}`);
        return res.status(403).json({
            status: "ACCESS_DENIED",
            message: "Security Alert: Missing or Invalid Brain PIN."
        });
    }

    next();
}