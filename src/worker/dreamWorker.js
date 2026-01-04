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

        const randomMemories = await Memory.aggregate([
            {
                $match: { userId: userObjectId }
            },
            {
                $sample: { size: 3 }
            }
        ]);
    console.log(`Memories found: ${randomMemories.length}`);

    if (randomMemories.length < 2){
        console.log(`[Dreaming Protocol] Not enough memories to generate a dream. Going back to sleep.`);
        return;
    }

    const fragments = randomMemories.map(m => `Fragment (${m.createdAt.toISOString().split('T')[0]}): ${m.content}`).join('\n\n');

    const prompt = `
    You are the Subconscious Mind of a digital brain. 
        You are currently dreaming.
        
        Here are 3 random, unrelated memory fragments from the user's past:
        ${fragments}

        Your Goal:
        - Hallucinate a connection between these unrelated things.
        - Find a hidden philosophical pattern, a weird coincidence, or a creative spark.
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

    cron.schedule('*/2 * * * *', async () => {
        const user = await User.findOne({});
        if (user) {
            await generateDream(user._id);
        }
    });
};