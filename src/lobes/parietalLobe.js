const { runText } = require("../ml/mlClient");
const { buildCortexPrompt } = require("../services/cortex.service");

async function processParietal({
    query,
    user,
    memories = []
}
) {
    const memoryPayload = memories.map(m =>({
        id: m._id?.toString(),
        context: m.context || "",
        preview: (m.content || "").slice(0, 300)
    }));

    const cortexPrompt = buildCortexPrompt({
        user,
        query,
        memory: JSON.stringify(memoryPayload),
        selectedLobe: "parietal"
    });

    const lobePrompt = `You Are the **Parietal Lobe** of a digital brain.
    Your job:
    - Work with MEMORY
    - Search through stored memories
    - Surface the most relevant ones
    - NEVER invent new memories
    - NEVER add fake details
    - If no memory matches, clearly say: No stored memory found for this query yet.
    You are given:
    - User: ${JSON.stringify(user)}
    - Query: "${query}"
    - Matched memories (id, context, preview): ${JSON.stringify(memoryPayload)}
  
    Behavior rules:
    - If memories.length === 0:
        -> Reply VERY SHORT:
        "No stored memory found for this query yet."
    - If there are memories:
        -> Do NOT rewrite full memories.
        -> Just list them like:
            1) short label + small snippet
            2) ...
        -> You can add a one-line suggestion how user can refine or build new memory.

    Output format:
    - Very short
    - Human friendly
    - No long essays
    - No extra sections, just answer.
    `;
    const answer = await runText({
        prompt: cortexPrompt + "\n\n---\n\n" + lobePrompt
    });

    return {
        lobe: "parietal",
        result: answer
    };
}

module.exports = {
    processParietal
};