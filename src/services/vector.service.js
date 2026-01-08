const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");

const embeddings = new GoogleGenerativeAIEmbeddings({
    modelName: "text-embedding-004",
    apiKey: process.env.GEMINI_API_KEY,
});

exports.generateVector = async  (text) => {
    try {
        const vector = await embeddings.embedQuery(text);
        console.log(`[VectorService] Generated Vector With ${vector.length} dimensions`);
        return vector;
    } catch (error) {
        console.error("[VectorService] Error Generating Vector:", error);
        throw error;
    }
};