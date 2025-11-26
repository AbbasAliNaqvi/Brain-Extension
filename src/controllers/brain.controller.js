const BrainReq = require("../models/BrainReq");
const {
    decideFinalLobe
} = require("../services/brainRouter.service");
const File = require("../models/file");

exports.createBrainRequest = async (req,res) => {
    try {
        const {
            query,
            fileId
        } = req.body;

        const user = req.user;
        const userSettings = user.settings || {};

        let fileMime = null;
        let inputType = "text";

        if (fileId) {
            const file = await File.findById(fileId);
            if (file){
                fileMime = file.mimeType;
                inputType = "file";
            }
        }

        const result = decideFinalLobe({
            query,
            fileMime,
            userSettings
        });

        const doc = await BrainReq.create({
            userId: user._id,
            inputType,
            query,
            fileId,
            lobe: "auto",
            selectedLobe: result.lobe,
            routerReason: result.reason,
            routerConfidence: result.confidence,
            status: "pending"
        });

        return res.json({
            status: "OK",
            message: "BRAIN REQUEST RECEIVED",
            requestId: doc._id,
            selectedLobe: result.lobe,
            routerReason: result.reason,
            confidence: result.confidence
        });
        
    } catch (err) {
        return res.status(500).json({
            status: "ERROR",
            message: err.message
        });
    }    
};

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