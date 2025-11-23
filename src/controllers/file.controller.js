const path = require('path');

const File = require('../models/file');
const storage = require('../services/storage.service');

exports.upload = async (req, res) => {
    try {
        const file = req.file;

        if (!file){
            return res.status(400).json({
                status: "ERROR",
                message: "NO FILE PROVIDED"
            });
        }

        const localPath = path.resolve(
            process.env.UPLOAD_DIR || path.join(__dirname, "..", "..", "uploads"),
            file.filename
        );

        const doc = await File.create({
            userId: req.user._id,
            originalName: file.originalname,
            filename: file.filename,
            mimeType: file.mimetype,
            size: file.size,
            url: localPath,
            path: localPath,
            storage: "local",
            ingestionStatus: "queued"
        });

        try {
            const mimeType = file.mimetype || "application/octet-stream";

            const result = await storage.storeFile({
                localPath,
                mimeType,
                useCloudinary: process.env.USE_CLOUDINARY === 'true',
                useSupabase: process.env.USE_SUPABASE === 'true'
            });

            doc.storage = result.storage;
            doc.url = result.url;
            doc.path = result.path;
            
            if(result.metadata) {
                const {
                    width,
                    height,
                    format,
                    bytes,
                    resource_type,
                    created_at
                } = result.metadata;

                doc.metadata = {
                    width,
                    height,
                    format,
                    bytes,
                    resource_type,
                    created_at
                };
            } else {
                doc.metadata = {};
            }

            if (result.public_id) {
                doc.cloudinary_public_id = result.public_id;
            }
            if (result.supabase_path) {
                doc.supabase_path = result.supabase_path;
            }

            await doc.save();

        } catch (err) {
            doc.ingestionStatus = "error";
            doc.metadata = {
                uploadError: err.message
            };

            await doc.save();

            return res.status(500).json({
                status: "ERROR",
                message: "CLOUD UPLOAD FAILED",
                error: err.message
            });
        }

        res.status(201).json({
            status: "OK",
            file: doc
        });

    } catch (err) {
        res.status(500).json({
            status: "ERROR",
            message: err.message
    });
    }
};

exports.list = async (req, res) => {
    const files = await File.find({
        userId: req.user._id
    })
    .sort({
        createdAt: -1
    });

    res.json({
        status: "OK",
        files
    });
};

exports.get = async (req, res) => {
    const file = await File
    .findById(
        req.params.id
    );

    if (!file) {
        return res.status(404).json({
            status: "ERROR",
            message: "FILE NOT FOUND"
        });
    }

    res.json({
        status: "OK",
        file
    });

};

exports.delete = async (req, res) => {
    const file = await File
    .findById(
        req.params.id
    );

    if (!file) {
        return res.status(404).json({
            status: "ERROR",
            message: "FILE NOT FOUND"
        });
    }

    try {
        if (file.storage === "cloudinary" && file.cloudinary_public_id) {
            await require("../config/cloudinary")
            .uploader
            .destroy(
                file.cloudinary_public_id,
                { resource_type: "auto" }
            );
        }

        if (file.storage === "supabase" && file.supabase_path) {
            await require("../config/supabase")
            .storage
            .from(
                process.env.SUPABASE_BUCKET || 'brain-extension'
            )
            .remove([file.supabase_path]);
        }

    } catch{}
    
    await file.deleteOne();

    res.json({
        status: "OK",
        message: "FILE DELETED"
    });
};