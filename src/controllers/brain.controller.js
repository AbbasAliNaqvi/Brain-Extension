const BrainReq = require("../models/BrainReq");
const {
    decideFinalLobe
} = require("../services/brainRouter.service");
const File = require("../models/file");

const { request } = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.createBrainRequest = async (req,res) => {
    try {
        const {
            query,
            fileId,
            mode = "default",
            targetLanguage = "English",
            workspaceId = "General"
        } = req.body;

        const user = req.user;
        const userSettings = user.settings || {};

        let fileMime = null;
        let inputType = "text";

        if (fileId) {
            const file = await File.findById(fileId);
            if (file){
                fileMime = file.mimeType;
                inputType = "file";
            }
        }
        
        const result = await decideFinalLobe({
            query,
            fileMime,
            userSettings,
            mode,
            user
        });

        const doc = await BrainReq.create({
            userId: user._id,
            workspaceId,
            inputType,
            query,
            fileId,
            mode,
            targetLanguage,
            lobe: "auto",
            selectedLobe: result.lobe,
            routerReason: result.reason,
            routerConfidence: result.confidence,
            status: "pending"
        });

        return res.json({
            status: "OK",
            message: "BRAIN REQUEST RECEIVED",
            requestId: doc._id,
            selectedLobe: result.lobe,
            routerReason: result.reason,
            mode: doc.mode,
            confidence: result.confidence
        });
        
    } catch (err) {
        return res.status(500).json({
            status: "ERROR",
            message: err.message
        });
    }    
};

exports.getResult = async (req, res) => {
    try {
        const { id } = req.params;

        const doc = await BrainReq.findById(id);

        if(!doc) {
            return res.status(404).json({
                status: "ERROR",
                message: "BRAIN REQUEST NOT FOUND"
            });
        }

        return res.json({
            status: "OK",
            request: doc
        });

    } catch (err) {
        return res.status(500).json({
            status: "ERROR",
            message: err.message
        });
    }
};

exports.intake = async (req, res) => {
    try {
        const {
            query,
            lobe="auto",
            fileId=null,
            mode = "default"
        } = req.body;

        const inputType = fileId ? "file" : "text";

        const brainReq = await BrainReq.create({
            userId: req.user._id,
            inputType,
            query,
            fileId,
            lobe,
            status: "pending"
        });

        return res.json({
            status: "OK",
            message: "BRAIN REQUEST RECEIVED",
            requestId: brainReq._id
        });

    } catch (err) {
        return res.status(500).json({
            status: "ERROR",
            message: err.message
        });
    }
};

exports.getDreamJournal = async (req, res) => {
    try {
        const userId = req.user._id;

        const dreams = await BrainReq.find({
            userId: userId,
            query: "INTERNAL_DREAM_PROTOCOL",
            status: "done"
        })
        .select("output createdAt")
        .sort({ createdAt: -1 });

        const journal = dreams.map(d => ({
            id: d.id,
            date: d.createdAt,
            title: d.output?.title || "Untitled Dream",
            insight: d.output?.insight || "No Insight Available",
            action: d.output?.action || "Reflect On This"
        }));

        return res.json({
            status: "OK",
            count: journal.length,
            journal: journal
        });

    } catch (err) {
        return res.status(500).json({
            status: "ERROR",
            message: err.message
        });
    }
};

exports.coAsk = async (req, res) => {
    try {
        const userId = req.user._id;
        const { text, mode, workspaceId = "General" } = req.body;

        if (!text) return res.status(400).json({ status: "ERROR", message: "Text required" });

        let prompt = "";
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" }); 

        if (mode === "desi_analogy") {
            prompt = `You are a brilliant technical tutor for Indian students. Explain this complex technical concept using a very relatable Indian cultural analogy (e.g., Mumbai Locals, Dabbawalas, Cricket, Indian traffic, Indian weddings, or IRCTC queues). Make it highly accurate technically, but incredibly fun and easy to understand for an Indian context. \n\nConcept to explain: "${text}"`;
        } 
        else if (mode === "neural_link") {
            const vector = await generateVector(text);
            const pastMemories = await Memory.aggregate([
                {
                    $vectorSearch: {
                        index: "vector_index", path: "vector", queryVector: vector,
                        numCandidates: 50, limit: 3, filter: { userId: new mongoose.Types.ObjectId(userId) }
                    }
                }
            ]);

            if (pastMemories && pastMemories.length > 0) {
                const contextNotes = pastMemories.map(m => m.content).join("\n- ");
                prompt = `You are Brain OS, a personalized learning copilot. The user is currently reading this text online:\n"${text}"\n\nHere are notes they previously saved in their Second Brain:\n${contextNotes}\n\nTask: Explain the text they are reading briefly, and then EXPLICITLY connect it to their past notes. Show them exactly how this new concept relates to what they already know. Frame it as "I noticed you previously learned about..."`;
            } else {
                prompt = `Explain this technical concept simply: "${text}". Add a note at the end saying "You have no past memories saved about this topic yet. Save this to your Neural Net to build your knowledge graph!"`;
            }
        }

        console.log(`[Copilot] Processing ${mode} for user ${userId}...`);
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        return res.status(200).json({ status: "OK", response: responseText });

    } catch (err) {
        console.error("[Copilot Error]", err);
        return res.status(500).json({ status: "ERROR", message: err.message });
    }
};