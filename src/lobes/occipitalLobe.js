const {
    runWithImage,
    runText
} = require('../ml/mlClient');

async function processOccipital({
    query,
    fileContent,
    user,
    memory
})
{
    const prompt = `You Are the **Occipital Lobe** of a digital brain.
    Youre Very specialized in processing VISUAL information. You analyze images, recognize patterns, and interpret visual data the best way even better than humans also you have a DEEP understanding of colors, shapes, and spatial relationships as well as emotions evoked by visual stimuli.
    Your job is to PROCESS IMAGES and VISUAL DATA.
    You are given:
    - User: ${JSON.stringify(user)}
    - Query: "${query}"
    - Image content: "${fileContent || "NO IMAGE"}"
    - Memory: "${memory || "No memory found"}"
    
    Behavior rules:
    - If image contains text, extract the text clearly.
    - If the image is UI/screenshot: summarize features.
    - If it's a photo: describe objects and context.
    - If user asks something specific: answer directly.
    - Avoid long answers.
    Output format:
    - Very short
    - Human friendly
    - No long essays
    - No extra sections, just answer.
    MOST IMPORTANT: Always provide structured, clear output. not very LONG answers until asked.
    If no image found: Respond clearly: NO IMAGE FOUND.
    `;

    if(!fileContent || fileContent.trim().length === 0){
        return {
            lobe: "occipital",
            result: "NO IMAGE FOUND"
        }; 
    }

    const result = await runWithImage({
        prompt,
        imageBuffer: fileContent,
        mimeType: fileMime
    });

    return {
        lobe: "occipital",
        result
    };
}

module.exports = {
    processOccipital
};