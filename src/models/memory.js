const mongoose = require('mongoose');

const MemorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    BrainReqId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BrainReq',
    },
    tags: [{
        type: String
    }],
    vector:{
        type: [Number],
        default: [],
    },
    workspaceId: {
        type: String,
        default: "General",
        index: true 
    },
    context: {
        type: String
    },
    types: {
        type: String,
        enum: ["answer","fact","summary","other"],
        default: "answer"
    },
    decayRate: {
        type: Number,
        default: 0 
    },
    nextReviewDate: {
        type: Date,
        default: Date.now 
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

MemorySchema.index({
    content: "text",
    tags: "text"
});

module.exports = mongoose.models.Memory || mongoose.model("Memory", MemorySchema);