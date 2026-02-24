const mongoose = require('mongoose');

const Memory = require('../models/memory');

const publishEvent = require("../events/publishEvent");

const { generateVector } = require("../services/vector.service");

exports.listMemories = async (req, res) => {
    try {
        const userId = req.user._id;

        const memories = await Memory.find({
            userId
        }).sort({
            createdAt: -1
        }).limit(100);

        return res.json({
            status: "OK",
            count: memories.length,
            memories
        });
    } catch (err) {
        return res.status(500).json({
            status: "ERROR",
            message: err.message
        });
    }
}

exports.getMemory = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const memory = await Memory.findOne({
            _id: id,
            userId
        });

        if(!memory){
            return res.status(404).json({
                status: "ERROR",
                message: "MEMORY NOT FOUND"
            });
        }

        return res.json({
            status: "OK",
            memory
        });
    } catch (err) {
        return res.status(500).json({
            status: "ERROR",
            message: err.message
        });       
    }
};

exports.searchMemories = async (req, res) => {
    try {
        const userId = req.user._id;
        const {
            query
        } = req.query;

        if(!query || query.trim().length === 0){
            return res.status(400).json({
                status: "ERROR",
                message: "QUERY PARAM IS REQUIRED"
            });
        }
        
        console.log(`[Search] Vectorizing Query: ${query}`);

        const vector = await generateVector(query);

        const memories = await Memory.aggregate([
            {
                $vectorSearch: {
                    index: "vector_index",
                    path: "vector",
                    queryVector: vector,
                    numCandidates: 100,
                    limit: 10,
                    filter: { 
                        userId: new mongoose.Types.ObjectId(userId)
                    }

                }
            },
            {
                $project: {
                    _id: 1,
                    content: 1,
                    types: 1,
                    createdAt: 1,
                    score: { 
                        $meta: "vectorSearchScore"
                    }
                }
            }
        ]);

        return res.json({
            status: "OK",
            count: memories.length,
            memories,
        });

    } catch (err) {
        console.error("SEARCH MEMORIES ERROR:", err);
        return res.status(500).json({
            status: "ERROR",
            message: err.message
        });
    }
};

exports.addMemory = async (req, res) => {
    try {
        const userId = req.user._id;
        const {
            text,
            type = "answer"
        } = req.body;

        if (!text) {
            return res.status(400).json({ status: "ERROR", message: "Content is required" });
        }

        const memoryData = {
            userId,
            content: text,
            types: type
        };

        const newMemory = await Memory.create(memoryData);

        await publishEvent("MEMORY_INGESTED", {
            id: newMemory._id,
            userId: userId,
            content: newMemory.content,
        });

        return res.status(201).json({
            status: "OK",
            message: "MEMORY ADDED SUCCESSFULLY !!",
            memory: newMemory
        });

    } catch (err) {
        console.error("ADD MEMORY ERROR:", err);
        return res.status(500).json({
            status: "ERROR",
            message: err.message
        });
    }
};

exports.deleteMemory = async (req, res) => {
    try {
        const userId = req.user._id;
        const {
            id
        } = req.params;

        const memory = await Memory.findOneAndDelete({
            _id: id,
            userId
        });

        if(!memory){
            return res.status(404).json({
                status: "ERROR",
                message: "MEMORY NOT FOUND"
            });
        }

        return res.json({
            status: "OK",
            message: "MEMORY DELETED SUCCESSFULLY",
        });
    } catch (err) {
        return res.status(500).json({
            status: "ERROR",
            message: err.message
        });
    }
};

exports.getFlashcardsDue = async (req, res) => {
    try {
        const { workspaceId = "General" } = req.query; 
        const today = new Date();

        const dueMemories = await Memory.find({
            userId: req.user._id,
            workspaceId: workspaceId,
            nextReviewDate: { $lte: today } 
        })
        .sort({ nextReviewDate: 1 })
        .limit(10); 

        return res.json({
            status: "OK",
            count: dueMemories.length,
            flashcards: dueMemories
        });
    } catch (err) {
        return res.status(500).json({ status: "ERROR", message: err.message });
    }
};

exports.updateMemoryReview = async (req, res) => {
    try {
        const { memoryId, score } = req.body; 
        const memory = await Memory.findById(memoryId);

        if (!memory) return res.status(404).json({ message: "Memory not found" });

        if (score >= 3) {
            memory.decayRate += 1;
        } else {
            memory.decayRate = 0; 
        }

        const daysToAdd = memory.decayRate === 0 ? 0 : Math.pow(2, memory.decayRate);
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + daysToAdd);

        memory.nextReviewDate = nextDate;
        await memory.save();

        return res.json({ 
            status: "OK", 
            message: "Memory consolidated.", 
            nextReviewDate: nextDate 
        });
    } catch (err) {
        return res.status(500).json({ status: "ERROR", message: err.message });
    }
};