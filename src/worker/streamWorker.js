const {
    consumer,
    producer
} = require("../events/eventBus");

const Memory = require("../models/memory");
const { generateVector } = require("../services/vector.service");

const STREAM_KEY = "BRAIN_STREAM";
const GROUP_NAME = "BRAIN_WORKERS";
const CONSUMER_NAME = "WORKER_1";

const startNeuralBus = async () => {
    try {
        try {
            await producer.xgroup('CREATE', STREAM_KEY, GROUP_NAME, '0', 'MKSTREAM');
            console.log("[StreamWorker] Consumer Group Created");
        } catch (e) {
        }
        console.log("[StreamWorker] Starting to listening for events...");

        while (true) {
            const response = await consumer.xreadgroup(
                'GROUP', GROUP_NAME, CONSUMER_NAME,
                'BLOCK', 5000,
                'COUNT', 1,
                'STREAMS', STREAM_KEY, '>'
            );

            if(response){
                const [streamName, messages] = response[0];

                for(const message of messages){
                    const [id, fields] = message;
                    const eventType = fields[1];
                    const eventData = JSON.parse(fields[3]);

                    console.log(`[StreamWorker] Processing Event: ${eventType}`, eventData);

                    if(eventType === "MEMORY_INGESTED"){
                        try{
                        console.log("[StreamWorker] Vectorizing Memory....");

                        const vector = await generateVector(eventData.content);

                        await Memory.findByIdAndUpdate(eventData.id, {
                            vector: vector,
                            tags: ["processed", "ai-vectorized"]
                        });
                        console.log("[StreamWorker] Memory Vectorization Complete");
                        } catch(err){
                        console.error("[StreamWorker] Error Vectorizing Memory:", err);
                        }
                    }
                    await consumer.xack(STREAM_KEY, GROUP_NAME, id);
                }
            }
        }
    } catch (err) {
        console.error("[StreamWorker] Worker Failed:", err);
    }
};

module.exports = { startNeuralBus };