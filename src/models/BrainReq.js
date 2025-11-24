const mongoose = require("mongoose");

const brainRequestSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    inputType: {
        type: String,
        enum: ["text", "file", "image"],
        required: true,
    },
    query: {
        type: String,
    },
    fileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "File",
    },
    lobe: {
        type: String,
        enum: ["frontal", "temporal", "parietal", "occipital", "auto"],
        default: "auto",
    },
    status: {
        type: String,
        enum: ["pending", "processing", "done", "error"],
        default: "pending",
    },
    output: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
    },
    error: {
        type: String,
        default: null,
    }
},   { timestamps: true }
);

module.exports = mongoose.model("BrainReq", brainRequestSchema);