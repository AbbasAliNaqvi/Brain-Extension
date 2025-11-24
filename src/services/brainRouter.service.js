const FRONTAL_KEYWORDS = [
    "plan",
    "decide",
    "explain",
    "solve",
    "brainstorm",
    "improve",
    "optimize",
    "strategy",
    "why",
    "how"
];

const TEMPORAL_KEYWORDS = [
    "summarize",
    "analyze",
    "explain this file",
    "read this",
    "extract",
    "convert",
    "structure",
    "topic",
    "concept"
];

const PARIENTAL_KEYWORDS = [
    "remember",
    "recall",
    "find",
    "search",
    "my notes",
    "what did i write",
    "memory",
    "previous",
    "history"
];

const OCCIPITAL_KEYWORDS = [
    "read image",
    "screenshot",
    "photo",
    "extract text from image",
    "diagram",
    "sketch",
    "visual",
    "handwriting"
];

function matchKeywords(text, list) {
    if(!text) return false;
    const t = text.toLowerCase();
    return list.some(k => t.includes(k));
}

//ML MODEL BAAD ME ADD KARUNGA IDHAR MAI

function ruleBaseRouter({
    query,
    fileMime
}){
    if(fileMime?.startsWith("image/")) {
        return "occipital";
    }

    if(fileMime?.includes("pdf") || fileMime?.includes("document")) {
        return "temporal";
    }

    if(matchKeywords(query, OCCIPITAL_KEYWORDS)) return "occipital";
    if(matchKeywords(query, TEMPORAL_KEYWORDS)) return "temporal";
    if(matchKeywords(query, FRONTAL_KEYWORDS)) return "frontal";
    if(matchKeywords(query, PARIENTAL_KEYWORDS)) return "pariental";

    return "frontal";
}

module.exports = {
    ruleBaseRouter
};