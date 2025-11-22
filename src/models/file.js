const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    filename: {
      type: String,
    },
    mimeType: {
      type: String,
    },
    size: {
      type: Number,
    },
    storage: {
      type: String,
      enum: ["local", "cloudinary", "supabase"],
      default: "local",
    },
    url: {
      type: String,
    },
    path: {
      type: String,
    },
    cloudinary_public_id: {
      type: String,
    },
    supabase_path: {
      type: String,
    },
    ingestionStatus: {
      type: String,
      enum: ["queued", "processing", "done", "error"],
      default: "queued",
    },
    metadata: {
      type: mongoose.Mixed,
      default: {},
    },
  },
    { timestamps: true }
);

module.exports = mongoose.model("File", fileSchema);