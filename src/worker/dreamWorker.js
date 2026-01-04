const cron = require("node-cron");
const mongoose = require("mongoose");

const BrainReq = require("../models/BrainReq");
const Memory = require("../models/Memory");
const User = require("../models/User");

const { runText } = require("../ml/mlClient");
const { notifyUser } = require("../services/socket.service");

async function generateDream(userId) {
    console.log(`[Dreaming Protocol] Starting dream generation for user: ${userId}`);

    try {

        const userObjectId = new mongoose.Types.ObjectId(userId);

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentMemories = await Memory.find({ 
            userId: userObjectId,
            createdAt: { $gte: oneDayAgo }
        }).limit(1);

        const deepMemories = await Memory.aggregate([
            { $match: { userId: userObjectId, createdAt: { $lt: oneDayAgo } } },
            { $sample: { size: 2 } }
        ]);

        if (recentMemories.length === 0 && deepMemories.length === 0) {
            console.log(`[Dreaming Protocol] Not enough memories to generate a dream. Going back to sleep.....`); 
            return;
        }

        const recentText = recentMemories.length ? `RECENT EXPERIENCE: ${recentMemories[0].content}` : "RECENT EXPERIENCE: None (User was inactive)";
        
        const deepText = deepMemories.map(m => `PAST KNOWLEDGE: ${m.content}`).join("\n");

    const prompt = `
        You are the Subconscious Mind of a digital brain. 
        You are currently dreaming.
        Input Data:
        1. ${recentText}
        2. ${deepText}

        Task:
        - Analyze the User's RECENT EXPERIENCE.
        - Connect it to their PAST KNOWLEDGE.
        - If they learned something new, anchor it to an old concept.
        - If the recent experience contradicts the past, highlight the conflict.
        - Be poetic, mysterious, and insightful.
        
        Output Format (JSON only):
        {
            "title": "A short, catchy dream title",
            "insight": "Two sentences connecting the dots",
            "action": "One weird/creative suggestion based on this connection"
        }
    `;

    const rawOutput = await runText({
        prompt
    });

    const cleanOutput = rawOutput.replace(/```json/g, "").replace(/```/g, "").trim();

    let dreamData;

    try {
        dreamData = JSON.parse(cleanOutput);
    } catch (e) {
        dreamData = {
            title: "A Fragmented Dream",
            insight: cleanOutput,
            action: "Reflect On This"
        };
    }

    const dreamReq = await BrainReq.create({
        userId: userId,
        inputType: "text",
        query: "INTERNAL_DREAM_PROTOCOL",
        lobe: "frontal",
        mode: "creative",
        status: "done",
        output: dreamData
    });

    notifyUser(userId, "brain_dream", {
        event: "morning_insight",
        data: dreamData,
        requestId: dreamReq._id
    });

    console.log(`[Dreaming Protocol] Dream Generated For ${userId}: "${dreamData.title}"`);

    } catch (err) {
    console.error("[Dreaming Protocol] Nightmare (Dream Error):", err.message);
    }
}

exports.startDreaming = () => {
    console.log("[Dreaming Protocol] ONLINE....");

    cron.schedule('*/15 * * * *', async () => {
        try {
            console.log("[Cron] Waking up to check for dreamers...");
            const users = await User.find({}, '_id name');

            console.log(`[Cron] Found ${users.length} potential dreamers.`);

            for (const user of users) {

                await generateDream(user._id);

                await new Promise(resolve => setTimeout(resolve, 2000));
            }

        } catch (err) {
            console.error("[Cron Error] Dreaming cycle failed:", err.message);
        }
    });
};