const mongoose = require('mongoose');

const MemorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
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

module.exports = mongoose.model("Memory", MemorySchema);