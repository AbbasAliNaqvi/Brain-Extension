const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment variables");
}

const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite"
})

async function handleGeminiCall(fn, retries = 3) {
    try {
        return await fn();
    } catch (err) {
        const message = err?.message || "";
        const isQuotaError = message.includes("429") || message.includes("quota") || message.includes("503");
        let retryDelay = 10000;
        try {
            const match = message.match(/retry in (\d+(\.\d+)?)/i);
            if (match && match[1]) {
                retryDelay = Math.ceil(parseFloat(match[1])) * 1000;
            }
        } catch (e) {}

        if (isQuotaError && retries > 0) {
            console.warn(`Gemini Limit Hit. Pausing for ${retryDelay / 1000}s... (${retries} retries left)`);
            await new Promise(res => setTimeout(res, retryDelay + 1000));
            return handleGeminiCall(fn, retries - 1);
        }
        console.error("Gemini Fatal Error:", message);
        throw err;
    }
}

async function runText({ prompt }) {
    return handleGeminiCall(async () => {
        const result = await model.generateContentStream(prompt);
        let final = "";
        for await (const chunk of result.stream) {
            final += chunk.text();
        }
        return final;
    });
}

async function runWithImage({ prompt, imageBuffer, mimeType }) {
    return handleGeminiCall(async () => {
        const response = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType,
                    data: imageBuffer.toString("base64"),
                },
            },
        ]);
        return response.response.text();
    });
}

module.exports = {
    runText,
    runWithImage
};