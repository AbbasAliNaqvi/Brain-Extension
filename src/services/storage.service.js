const fs = require('fs');
const path = require('path');

const cloudinary = require('../config/cloudinary');
const supabase = require('../config/supabase');
const { create } = require('../models/User');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, ".." , ".." , "uploads");

function mimeFromName(filename) {
    const ext = path.extname(filename).toLowerCase();
    if (ext === '.png') return 'image/png';
    if (ext === ".jpg" || ext === ".jpeg") return 'image/jpeg';
    if (ext === ".gif") return 'image/gif';
    if (ext === ".pdf") return 'application/pdf';
    if (ext === ".txt") return 'text/plain';
    return 'application/octet-stream';
}

function bucketName() {
    return process.env.SUPABASE_BUCKET || 'brain-extension';
}

async function uploadToCloudinary( localPath) {
    const res = await cloudinary.uploader.upload(localPath, {
        resource_type: "auto",
        overwrite: false,
    });

    return {
        url: res.secure_url,
        public_id: res.public_id,
        metadata: {
            width: res.width,
            height: res.height,
            format: res.format,
            bytes: res.bytes,
            resource_type: res.resource_type,
            created_at: res.created_at,
        }
    };
}

async function uploadToSupabase(localPath) {
    const buffer = fs.readFileSync(localPath);
    const filename = `${Date.now()}_${path.basename(localPath)}`;
    const filePath = `uploads/${filename}`;

    const { data, error} = await supabase
    .storage
    .from(bucketName())
    .upload(filePath, buffer, {
        contentType: mimeFromName(localPath),
        upsert: false,
    });
    
    if (error) {
        throw error;
    }

    const publicUrl = supabase
    .storage
    .from(bucketName())
    .getPublicUrl(filePath).data.publicUrl;

    return {
        url: publicUrl,
        path: filePath,
        metadata: data
    };
}

async function storeFile({localPath, mimeType = "", useCloudinary, useSupabase}) {
    const isMedia = mimeType?.startsWith('image/') || mimeType.startsWith('video/');

    if (useCloudinary && isMedia) {
        return {
            storage: "cloudinary",
            ...(await uploadToCloudinary(localPath))
        };
    }
    
    if (useSupabase) {
        return {
            storage: "supabase",
            ...(await uploadToSupabase(localPath))
        };
    }

    return {
        storage: "local",
        url: localPath,
        path: localPath,
        metadata: {}
    };
}

module.exports = {
    storeFile,
    uploadToCloudinary,
    uploadToSupabase
};