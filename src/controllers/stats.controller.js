const Memory = require("../models/memory");
const User = require("../models/User");

exports.getStats = async (req, res) => {
    try {
        const userId = req.user._id;
        const today = new Date();

        const [
            totalMemories,
            overdueCount,
            todaySavesCount,
            user
        ] = await Promise.all([
            Memory.countDocuments({ userId }),
            Memory.countDocuments({
                userId,
                nextReviewDate: { $lte: today }
            }),
            Memory.countDocuments({
                userId,
                createdAt: {
                    $gte: new Date(today.toISOString().split("T")[0] + "T00:00:00.000Z"),
                    $lt: new Date(today.toISOString().split("T")[0] + "T23:59:59.999Z")
                }
            }),
            User.findById(userId).select("createdAt name email").lean()
        ]);

        let healthScore = 100;
        if (totalMemories > 0) {
            const overdueRatio = overdueCount / totalMemories;
            healthScore = Math.max(0, Math.round((1 - overdueRatio) * 100));
        }

        const accountAgeDays = user?.createdAt
            ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
            : 0;

        return res.status(200).json({
            status: "OK",
            healthScore,
            totalMemories,
            dueCount: overdueCount,
            todaySaves: todaySavesCount,
            accountAgeDays
        });

    } catch (err) {
        return res.status(500).json({
            status: "ERROR",
            message: err.message
        });
    }
};