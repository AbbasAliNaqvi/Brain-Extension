const fs = require("fs");
const axios = require("axios");
const File = require("../models/file");
const { runWithImage } = require("../ml/mlClient");
const { buildCortexPrompt } = require("../services/cortex.service");

async function getImageBuffer(file) {
    if (!file) throw new Error("File not found for visual processing");

    if (file.storage === "local" || !file.storage) {
        if (fs.existsSync(file.path)) {
            return fs.readFileSync(file.path);
        } else {
            throw new Error("Local file not found on disk");
        }
    }

    if (file.url && file.url.startsWith("http")) {
        console.log("Downloading image from cloud...", file.url);
        const response = await axios.get(file.url, { responseType: 'arraybuffer' });
        return Buffer.from(response.data, 'binary');
    }

    throw new Error("Unsupported file storage type for Vision");
}

async function processOccipital({
    query,
    fileId,
    user,
    memory,
    mode
}) {

    const file = await File.findById(fileId);
    if (!file) throw new Error("No file provided for Visual Lobe");

    const imageBuffer = await getImageBuffer(file);

    const cortexPrompt = buildCortexPrompt({
        user,
        query,
        memory,
        selectedLobe: "occipital",
        mode
    });

    const finalPrompt = `
    ${cortexPrompt}
    
    You are the Occipital Lobe (Visual Cortex).
    Analyze the provided image deeply.
    
    User Query: "${query}"
    
    If the query asks to extract text, provide the text exactly.
    If the query asks to explain, describe the visual elements.
    `;

    const answer = await runWithImage({
        prompt: finalPrompt,
        imageBuffer: imageBuffer,
        mimeType: file.mimeType || "image/jpeg"
    });

    return {
        lobe: "occipital",
        result: answer
    };
}

module.exports = {
    processOccipital
};