const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;

if(!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment variables");
}

const gennAI = new GoogleGenerativeAI(apiKey);

const model = gennAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite"
});

async function runText({
    prompt
}) {
    const result = await model.generateContentStream(prompt);

    let final = "";

    for await (const chunk of result.stream) {
        const text = chunk.text();
        final += text;
    }

    return final;
}

async function runWithImage({
    prompt,
    imageBuffer,
    mimeType
}) {
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
}

module.exports = {
    runText,
    runWithImage
};