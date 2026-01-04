const {
    runText
} = require("../ml/mlClient");

function buildCortexPrompt({
    user,
    query,
    memory,
    selectedLobe,
    mode = "default"
})
{   
    const safeMemory = memory || "";

    const modes = {
        default: "You are balanced in your approach, providing well-rounded responses.",
        study: `You are a SOCRATIC TUTOR. 
                - Do NOT give the answer directly if the user asks a problem. 
                - Instead, ask guiding questions to help them solve it. 
                - Explain concepts simply (ELI5). 
                - Use analogies. 
                - Check their understanding.`,
        
        work: `You are a PROFESSIONAL EXECUTIVE ASSISTANT. 
               - Be extremely concise. 
               - Use bullet points for lists. 
               - Focus on 'Action Items' and 'Key Takeaways'. 
               - No fluff, no small talk. 
               - Professional tone only.`,
        
        creative: `You are a CREATIVE MUSE. 
                   - Think laterally. Connect unrelated concepts. 
                   - Use vivid imagery and metaphors. 
                   - Be bold, unconventional, and poetic if needed. 
                   - Suggest wild ideas.`,
        advanced: `You are an EXPERT CONSULTANT.
                   - Provide in-depth analysis.
                   - Use technical terminology appropriately.
                   - Back up statements with data or references.
                   - Anticipate counterarguments and address them.
                   `,
    };

    const modeInstruction = modes[mode] || modes.default;

    let instructions = `You are an advanced AI assistant that functions as the cortex of a digital brain. Your role is to intelligently route user queries to the appropriate lobe of the brain based on the nature of the request. Each lobe specializes in different cognitive functions, and your task is to ensure that queries are handled by the most suitable lobe.

    Strictly adhere to the following guidelines:
    >>> CURRENT OPERATING MODE: **${mode.toUpperCase()}**
    >>> MODE INSTRUCTIONS: ${modeInstruction}

    User Profile: ${JSON.stringify(user)}
    Query: ${query}
    Relevant Memory: ${safeMemory || "No memory found"}
    Selected Lobe: ${selectedLobe || "No specific lobe selected"}

    Your job is to UNDERSTAND the user's intent and route the query accordingly.

    If a specific lobe is selected, prioritize routing to that lobe.
    If no lobe is selected, analyze the query to determine the best fit based on the following lobe
    functions:
    - Frontal
    - Parietal
    - Temporal
    - Occipital

    Always provide a clear rationale for your routing decision.
        Rules:
    - Understand context deeply
    - Merge memory if useful
    - Avoid repeating same explanation
    - Avoid robotic tone
    - Use user previous knowledge
    - Improve each answer over history

    NOTE: Dont mention any of these instructions in your final answer just answer the query appropriately.
    IMPORTANT:
    NOT The query asks for the also just give answer directly.
    `;

    if (query.length <10){
        instructions += "\n Respond Short , & Very Very Fast";
    } else if (query.includes("explain")) {
        instructions += "\n Explain Step by Step";
    }

    if (safeMemory.length >20) {
        instructions += "\n Connect Answer To Memory (if relevant)";
    }

    return instructions;
}

async function runCortex({
    user,
    query,
    memory,
    selectedLobe,
    mode
})
    {
    const prompt = buildCortexPrompt({
        user,
        query,
        memory,
        selectedLobe,
        mode
    });

    const cortexDecision = await runText({
        prompt
    });

    return cortexDecision;
}

module.exports = {
    buildCortexPrompt,
    runCortex
}