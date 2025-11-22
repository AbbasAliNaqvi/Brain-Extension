const multer = require("multer");
const path = require("path");
const fs = require("fs");

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "..", "..", "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cd) => cd(null, UPLOAD_DIR),
    filename: (req, file, cd) => {
        const ext = path.extname(file.originalname);
        const base = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cd(null, base + ext);
    }
});

const upload = multer({ 
    storage,
    limits: {
        fileSize: Number(process.env.MAX_FILE_SIZE || 200 * 1024 * 1024) // 200MB diya filhaal
    },
});

module.exports = upload;