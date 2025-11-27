const Memory = require('../models/memory');

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
        
        const memories = await Memory.find({
            userId,
            $text: { $search: query }
        }).sort({
            createdAt: -1
        }).limit(50);

        return res.json({
            status: "OK",
            count: memories.length,
            memories,
        });
    } catch (err) {
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