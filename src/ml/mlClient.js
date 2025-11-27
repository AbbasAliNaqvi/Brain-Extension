const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;

if(!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment variables");
}

const gennAI = new GoogleGenerativeAI(apiKey);

const model = gennAI.getGenerativeModel({
    model: "gemini-2.0-flash"
});

async function runText({
    prompt
}) {
    const response = await model.generateContent(prompt);

    const test = response.response.text();

    return test;
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