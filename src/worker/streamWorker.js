const { eventBus } = require("../events/eventBus");
const Memory = require("../models/memory");
const { generateVector } = require("../services/vector.service");

const STREAM_KEY = "BRAIN_STREAM";

const startNeuralBus = () => {
    console.log("[StreamWorker] Starting to listen for events on local bus...");

    // Listen directly to the local event bus instead of polling Redis
    eventBus.on(STREAM_KEY, async (message) => {
        try {
            const { type: eventType, data: eventData } = message;

            console.log(`[StreamWorker] Processing Event: ${eventType}`);

            if (eventType === "MEMORY_INGESTED") {
                console.log("[StreamWorker] Vectorizing Memory....");

                const vector = await generateVector(eventData.content);

                await Memory.findByIdAndUpdate(eventData.id, {
                    vector: vector,
                    tags: ["processed", "ai-vectorized"]
                });
                
                console.log("[StreamWorker] Memory Vectorization Complete");
            }
        } catch (err) {
            console.error("[StreamWorker] Worker Processing Failed:", err);
        }
    });
};

module.exports = { startNeuralBus };