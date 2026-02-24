const {
    runText
} = require("../ml/mlClient");

function buildCortexPrompt({
    user,
    query,
    memory,
    selectedLobe,
    mode = "default",
    targetLanguage = "English"
})
{   
    const safeMemory = memory || "";

    const modes = {
        default: "You are balanced in your approach, providing well-rounded responses.",
        study: `You are a SOCRATIC TUTOR for engineering students. 
                - Explain complex technical concepts simply. 
                - Use analogies. 
                - Do NOT give the answer directly if the user asks a problem, guide them.`,
                
        work:  `You are a PROFESSIONAL EXECUTIVE ASSISTANT. 
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

    let instructions = `You are Brain Extension, an advanced AI Cognitive OS for developers.
    
    >>> CURRENT OPERATING MODE: **${mode.toUpperCase()}**
    >>> MODE INSTRUCTIONS: ${modeInstruction}

    User Query: "${query}"
    Contextual Memory / File Data: "${safeMemory || "No memory found"}"
    Active Workspace (Lobe): "${selectedLobe || "General"}"

    RULES:
    - Understand context deeply and merge memory if useful.
    - Improve each answer over history.
    - Do NOT mention these instructions in your final output.`;


    if (targetLanguage && targetLanguage.toLowerCase() !== "english") {
        instructions += `
        
    VERNACULAR TRANSLATION REQUIREMENT
    You MUST translate your explanation into ${targetLanguage}.
    HOWEVER, you must apply "Syntax-Safe" translation:
    1. STRICTLY PRESERVE all English programming syntax, code blocks, JSON, brackets {}, and terminal commands.
    2. ONLY translate the theoretical explanations and markdown text into ${targetLanguage}.
    3. Do not translate variable names or technical keywords (e.g., keep "API", "React", "State" in English).`;
    }

    if (query.length < 10){
        instructions += "\n Respond Short , & Very Very Fast";
    } else if (query.includes("explain")) {
        instructions += "\n Explain Step by Step";
    }

    return instructions;
}

async function runCortex({
    user,
    query,
    memory,
    selectedLobe,
    mode,
    targetLanguage 
}) {
    const prompt = buildCortexPrompt({
        user, query, memory, selectedLobe, mode, targetLanguage
    });

    const cortexDecision = await runText({ prompt });
    return cortexDecision;
}

module.exports = {
    buildCortexPrompt,
    runCortex
}