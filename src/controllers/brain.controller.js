const BrainReq = require("../models/BrainReq");
const {
    decideFinalLobe
} = require("../services/brainRouter.service");
const File = require("../models/file");
const { generateVector } = require("../services/vector.service");
const Memory = require("../models/memory");

const mongoose = require("mongoose");
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

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        return res.status(200).json({ status: "OK", response: responseText });

    } catch (err) {
        return res.status(500).json({ status: "ERROR", message: err.message });
    }
};

exports.vision = async (req, res) => {
    try {
        const { image, workspaceId = "General" } = req.body;
        const userId = req.user._id;

        if (!image || !image.startsWith("data:image/")) {
            return res.status(400).json({
                status: "ERROR",
                message: "image field must be a base64 data URL"
            });
        }

        const [header, base64Data] = image.split(",");
        const mimeType = header.match(/data:(.*);base64/)?.[1] || "image/jpeg";

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

        const prompt = `You are an expert technical educator analyzing a screen capture.
        Analyze this screenshot carefully and provide:
        1. What's in this image
        2. Complete Explanation
        3. Key Takeaways
        4. Action Items
        Be specific, technically accurate, and use Indian tech context where helpful.`;

        const result = await model.generateContent([
            prompt,
            { inlineData: { data: base64Data, mimeType } }
        ]);

        const explanation = result.response.text();
        const vector = await generateVector(explanation.substring(0, 1000));

        await Memory.create({
            userId,
            content: `[Snap & Learn]\n${explanation.substring(0, 2000)}`,
            types: "answer",
            workspaceId,
            vector,
            nextReviewDate: new Date(),
            decayRate: 0
        });

        return res.status(200).json({
            status: "OK",
            explanation,
            autoSaved: true,
            workspaceId
        });

    } catch (err) {
        return res.status(500).json({
            status: "ERROR",
            message: err.message
        });
    }
};

exports.translate = async (req, res) => {
    try {
        const { text, targetLanguage = "Hindi" } = req.body;

        if (!text || text.trim().length < 2) {
            return res.status(400).json({
                status: "ERROR",
                message: "text field is required"
            });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
        const prompt = `Translate the following text to ${targetLanguage}.
        Rules: Preserve technical terms, proper nouns, and code snippets as-is (in English). For Hinglish: mix Hindi and English naturally. Return ONLY the translated text.
        Text to translate: "${text}"`;

        const result = await model.generateContent(prompt);
        const translation = result.response.text().trim().replace(/^["']|["']$/g, "");

        return res.status(200).json({
            status: "OK",
            translation,
            sourceText: text,
            targetLanguage
        });

    } catch (err) {
        return res.status(500).json({
            status: "ERROR",
            message: err.message
        });
    }
};