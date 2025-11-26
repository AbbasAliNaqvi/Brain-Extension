const { ruleBaseRouter } = require("./brainRules.service");
const { classifyBrainRequest } = require("./brainClassifier.service");

function decideFinalLobe({
    query,
    fileMime,
    userSettings,
}){
    const ruleLobe = ruleBaseRouter({
        query,
        fileMime
    });

    const cls = classifyBrainRequest({
        query,
        fileMime,
        userSettings
    });

    if(cls.lobe === "parietal" && userSettings && !userSettings.memoryEnabled){
        return {
            lobe: ruleLobe,
            reason: "MEMORY DISABLED - FALLBACK TO RULE ENGINE",
            confidence: cls.confidence
        };
    }

    if(cls.lobe === "occipital" && userSettings && !userSettings.visionEnabled){
        return {
            lobe: ruleLobe,
            reason: "VISION DISABLED - FALLBACK TO RULE ENGINE",
            confidence: cls.confidence
        };
    }

    if(cls.confidence >= 0.7){
        return {
            lobe: cls.lobe,
            reason: "HIGH CONFIDENCE FROM CLASSIFIER",
            confidence: cls.confidence
        };
    }

    return {
        lobe: ruleLobe,
        reason: "RULE ENGINE SELECTED DUE TO LOW CONFIDENCE",
        confidence: cls.confidence
    };    
}

module.exports = {
    decideFinalLobe
};