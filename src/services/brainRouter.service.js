const { ruleBaseRouter } = require("./brainRules.service");
const { classifyBrainRequest } = require("./brainClassifier.service");
const { runCortex } = require("./cortex.service");

async function decideFinalLobe({
    query,
    fileMime,
    userSettings,
    memory,
    user
}){
    const ruleDecision = ruleBaseRouter({
        query,
        fileMime
    });

    const cls = classifyBrainRequest({
        query,
        fileMime,
        userSettings
    });

    let preliminaryLobe = cls.confidence >= 0.7 ? cls.lobe : ruleDecision;

    const cortex = await runCortex({
        user,
        query,
        memory,
        selectedLobe: preliminaryLobe
    });

    return {
        lobe: cortex.lobe || preliminaryLobe,
        confidence: cls.confidence,
        reason: cortex.reason || cls.reason|| "Cortex Decision"
    };
}

module.exports.decideFinalLobe = decideFinalLobe;