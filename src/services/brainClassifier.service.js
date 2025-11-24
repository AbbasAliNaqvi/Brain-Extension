const { ruleBaseRouter } = require("./brainRouter.service");

function scoreKeywords(
    query,
    list
){
    if(!query) return 0;
    const t = query.toLowerCase();
    let score = 0;
    list.forEach(k  => {
        if(t.includes(k)) score += 1;
    });
    return score;
}

function classifyBrainRequest({
    query,
    fileMime,
    userSettings
}) {
    const ruleLobe = ruleBaseRouter({
        query,
        fileMime
    });

    const frontalScore   = scoreKeywords(query, ["plan","solve","think","idea","decision"]);
    const temporalScore  = scoreKeywords(query, ["summarize","analyze","explain","extract"]);
    const parietalScore  = scoreKeywords(query, ["remember","recall","search","find","memory"]);
    const occipitalScore = scoreKeywords(query, ["image","photo","diagram","vision","screenshot"]);

    const scores = {
        frontal: frontalScore,
        temporal: temporalScore,
        parietal: parietalScore,
        occipital: occipitalScore
    };

    const finalLobe = Object.keys(scores).reduce((a, b) => 
        scores[a] > scores[b] ? a : b
    );

    const finalScore = scores[finalLobe];

    if (userSettings){
        if (finalLobe == "parietal" && !userSettings.memoryEnabled) {
            return {
                lobe: ruleLobe,
                confidence: 0.5,
                reason: "Memory Disabled"
            };
        }
        
        if (finalLobe == "occipital" && !userSettings.visionEnabled) {
            return {
                lobe: ruleLobe,
                confidence: 0.5,
                reason: "Vision Disabled"
            };
        }
    }

    return {
        lobe: finalScore > 0 ? finalLobe : ruleLobe,
        confidence: finalScore > 0 ? (0.5 + finalScore * 0.1) : 0.6,
        ruledBy: finalScore > 0 ? "classifier" : "rules"
    };
}

module.exports = {
    classifyBrainRequest
};