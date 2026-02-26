const { GoogleGenerativeAI } = require("@google/generative-ai");
const mongoose = require("mongoose");
const Memory = require("../models/memory");
const { generateVector } = require("../services/vector.service");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function sendEvent(res, data) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    if (typeof res.flush === "function") res.flush();
}

function buildPrompt(mode, text, memories, targetLanguage = "English") {
    const langNote = targetLanguage !== "English"
        ? `\n\n**RESPOND IN ${targetLanguage.toUpperCase()}**. Keep code, technical terms, and proper nouns in English.`
        : "";

    switch (mode) {
        case "desi_analogy":
            return `You are a brilliant technical educator for Indian developers and students. Explain the concept below using a vibrant, accurate Indian cultural analogy. Choose ONE of these contexts: IRCTC train booking, Mumbai Local trains, Dabbawalas of Mumbai, IPL auction, Indian wedding planning, Chai tapri conversations, Cricket match strategies, Jugaad engineering solutions. Rules: 1. The analogy must be TECHNICALLY ACCURATE. 2. After the analogy, give a precise technical explanation. 3. End with a 1-line "TL;DR" in Hinglish. Concept to explain: "${text}"${langNote}`;

        case "neural_link":
            if (memories && memories.length > 0) {
                const context = memories.map((m, i) => `[${i + 1}] (Workspace: ${m.workspaceId || "General"})\n${m.content}`).join("\n\n");
                return `You are Brain OS, an AI that connects new knowledge to a user's existing Second Brain. The user is currently reading this text: "${text}"\n\nThese are RELEVANT NOTES from their Second Brain:\n---\n${context}\n---\nYour task: 1. Briefly explain what the user is currently reading. 2. Explicitly bridge it to their past notes — use the phrase "I noticed you previously saved notes about..." 3. Show EXACTLY how this new concept relates to what they already know. 4. If there are knowledge gaps, mention what they should learn next.${langNote}`;
            } else {
                return `Explain this technical concept clearly and concisely: "${text}"\n\nAt the end, add a friendly note: "💡 You haven't saved any related notes yet. Hit Save to start building your knowledge graph on this topic!"${langNote}`;
            }

        case "eli5":
            return `You are the world's best teacher. Explain the following concept as if you're talking to a curious 10-year-old who loves cricket and Minecraft. Rules: 1. NO jargon. 2. Use ONE fun, relatable analogy. 3. Use SHORT paragraphs. Max 3 sentences each. 4. End with "The big idea in one sentence:". Concept: "${text}"${langNote}`;

        case "debate":
            return `You are a Socratic devil's advocate. Your job is to challenge. Given this concept: "${text}" Provide: 1. The strongest counter-argument. 2. The key flaw or limitation. 3. An alternative approach. 4. When it IS valid. Be sharp, intellectually honest, and not dismissive.${langNote}`;

        case "roast_code":
        case "debug_code":
            return `You are a Staff Engineer doing a code review. Analyze the following code:\n\`\`\`\n${text}\n\`\`\`\nProvide a structured analysis:\nWhat This Code Does\nTime & Space Complexity\nPotential Bugs or Issues\nCode Quality\nSuggested Improvements\nBe direct and specific. Cite line references if possible.${langNote}`;

        case "arch_diagram":
            return `You are a solutions architect. Create a visual architecture from this description: "${text}"\nRespond in this EXACT format:\n## Architecture Overview\n## Diagram\n\`\`\`mermaid\ngraph TD\n  A[Service A] -->|API| B[Service B]\n\`\`\`\n## Component Breakdown\n## Data Flow\n## Scaling Considerations${langNote}`;

        default:
            return `Explain this concisely and insightfully:\n"${text}"${langNote}`;
    }
}

exports.streamCoAsk = async (req, res) => {
    const { text, mode = "eli5", workspaceId = "General", targetLanguage = "English" } = req.body;
    const userId = req.user?._id;

    if (!text || typeof text !== "string" || text.trim().length < 3) {
        return res.status(400).json({
            status: "ERROR",
            message: "text field is required (min 3 chars)"
        });
    }

    const VALID_MODES = ["desi_analogy", "neural_link", "eli5", "debate", "debug_code", "roast_code", "arch_diagram"];
    
    if (!VALID_MODES.includes(mode)) {
        return res.status(400).json({
            status: "ERROR",
            message: `Invalid mode. Use: ${VALID_MODES.join(", ")}`
        });
    }

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200);
    res.write(": ping\n\n");

    try {
        let relevantMemories = [];

        if (mode === "neural_link") {
            try {
                const vector = await generateVector(text);
                relevantMemories = await Memory.aggregate([
                    {
                        $vectorSearch: {
                            index: "vector_index",
                            path: "vector",
                            queryVector: vector,
                            numCandidates: 50,
                            limit: 4,
                            filter: {
                                userId: new mongoose.Types.ObjectId(userId)
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            content: 1,
                            workspaceId: 1,
                            createdAt: 1,
                            score: { $meta: "vectorSearchScore" }
                        }
                    }
                ]);

                if (relevantMemories.length > 0) {
                    sendEvent(res, { memories: relevantMemories });
                }
            } catch (vecErr) {
                console.error("[Stream] Vector search failed:", vecErr.message);
            }
        }

        const prompt = buildPrompt(mode, text.trim(), relevantMemories, targetLanguage);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
        const streamResult = await model.generateContentStream(prompt);

        for await (const chunk of streamResult.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
                sendEvent(res, { chunk: chunkText });
            }
        }

        sendEvent(res, { done: true });
        res.end();
        
    } catch (err) {
        try {
            sendEvent(res, { error: err.message || "AI generation failed" });
            res.end();
        } catch {}
    }

    req.on("close", () => {
        console.log(`[Stream] Client disconnected (mode: ${mode})`);
    });
};