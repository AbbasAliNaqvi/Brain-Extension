const BrainReq = require("../models/BrainReq");

exports.intake = async (req, res) => {
    try {
        const {
            query,
            lobe="auto",
            fileId=null
        } = req.body;

        const inputType = fileId ? "file" : "text";

        const brainReq = await BrainReq.create({
            userId: req.user._id,
            inputType,
            query,
            fileId,
            lobe,
            status: "pending"
        });

        return res.json({
            status: "OK",
            message: "BRAIN REQUEST RECEIVED",
            requestId: brainReq._id
        });

    } catch (err) {
        return res.status(500).json({
            status: "ERROR",
            message: err.message
        });
    }
};