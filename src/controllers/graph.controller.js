const Memory = require('../models/memory');
const File = require("../models/file");

exports.getNeuroGraph = async (req, res) => {
    try {
        const userId = req.user._id;

        const memories = await Memory.find({
            userId
        }).select("content types createdAt tags");

        const files = await File.find({
            userId
        }).select("originalName mimeType createdAt");

        const nodes = [];
        const links = [];

        memories.forEach(mem => {
            nodes.push({
                id: mem._id.toString(),
                label: mem.content.substring(0, 30) + "...",
                fullText: mem.content,
                type: "memory",
                group: mem.types || "answer",
                val: 5
            });
        });

        files.forEach(file => {
            nodes.push({
                id: file._id.toString(),
                label: file.originalName,
                type: "file",
                group: "file",
                val: 10
            });
        });

        const getKeywords = (text) => {
            if(!text)
                return new Set();
            return new Set(text.toLowerCase().split(/\W+/).filter(w => w.length > 5));
        };

        for (let i = 0; i < memories.length; i++){
            const keywordsA = getKeywords(memories[i].content);

            for (let j = 0; j < memories.length; j++){
                const keywordsB = getKeywords(memories[j].content);

                const intersection = [...keywordsA].filter(x => keywordsB.has(x));

                if(intersection.length > 0){
                    links.push({
                        source: memories[i]._id.toString(),
                        target: memories[j]._id.toString(),
                        strength: intersection.length
                    });
                }
            }
        }

        return res.json({
            status: "OK",
            stats: {
                totalNodes: nodes.length,
                totalLinks: links.length
            },
            data: {
                nodes,
                links
            }
        });

    } catch (err) {
        return res.status(500).json({
            status: "ERROR",
            message: err.message
        });
    }
};