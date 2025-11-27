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
    context: {
        type: String
    },
    types: {
        type: String,
        enum: ["answer","fact","summary","other"],
        default: "answer"
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

MemorySchema.index({
    content: "text",
    context: "text",
    tags: "text"
});

module.exports = mongoose.model("Memory", MemorySchema);