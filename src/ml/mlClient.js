const Groq = require("groq-sdk");

const apiKey = process.env.GROQ_API_KEY3;

if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set in environment variables");
}

const groq = new Groq({ apiKey });

async function handleGroqCall(fn, retries = 3) {
    try {
        return await fn();
    } catch (err) {
        const message = err?.message || "";
        const isQuotaError = message.includes("429") || message.includes("rate_limit") || message.includes("503");
        let retryDelay = 5000;
        
        try {
            const match = message.match(/retry in (\d+(\.\d+)?)/i);
            if (match && match[1]) {
                retryDelay = Math.ceil(parseFloat(match[1])) * 1000;
            }
        } catch (e) {}

        if (isQuotaError && retries > 0) {
            console.warn(`Groq Limit Hit. Pausing for ${retryDelay / 1000}s... (${retries} retries left)`);
            await new Promise(res => setTimeout(res, retryDelay + 1000));
            return handleGroqCall(fn, retries - 1);
        }
        console.error("Groq Fatal Error:", message);
        throw err;
    }
}

async function runText({ prompt }) {
    return handleGroqCall(async () => {
        const streamResult = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            stream: true,
        });
        
        let final = "";
        for await (const chunk of streamResult) {
            final += chunk.choices[0]?.delta?.content || "";
        }
        return final;
    });
}

async function runWithImage({ prompt, imageBuffer, mimeType }) {
    return handleGroqCall(async () => {
        const base64Image = imageBuffer.toString("base64");
        const response = await groq.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: { url: `data:${mimeType};base64,${base64Image}` },
                        },
                    ],
                },
            ],
            model: "llama-3.2-11b-vision-preview",
        });
        return response.choices[0]?.message?.content || "";
    });
}

module.exports = {
    runText,
    runWithImage
};