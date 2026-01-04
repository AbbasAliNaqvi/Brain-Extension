const BrainReq = require("../models/BrainReq");
const {
    decideFinalLobe
} = require("../services/brainRouter.service");
const File = require("../models/file");
const { request } = require("express");

exports.createBrainRequest = async (req,res) => {
    try {
        const {
            query,
            fileId,
            mode = "default"
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
            userSettings,
            mode
        });

        const doc = await BrainReq.create({
            userId: user._id,
            inputType,
            query,
            fileId,
            mode,
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
            mode: doc.mode,
            confidence: result.confidence
        });
        
    } catch (err) {
        return res.status(500).json({
            status: "ERROR",
            message: err.message
        });
    }    
};

exports.getResult = async (req, res) => {
    try {
        const { id } = req.params;

        const doc = await BrainReq.findById(id);

        if(!doc) {
            return res.status(404),json({
                status: "ERROR",
                message: "BRAIN REQUEST NOT FOUND"
            });
        }

        return res.json({
            status: "OK",
            request: doc
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
            fileId=null,
            mode = "default"
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