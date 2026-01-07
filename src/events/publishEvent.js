const { producer } = require("../events/eventBus");

const STREAM_KEY = "BRAIN_STREAM";

const publishEvent = async (type, payload)=> {
    try {
        await producer.xadd(
            STREAM_KEY,
            '*',
            "event", type,
            "data", JSON.stringify(payload)
        );
        console.log(`[EventPublisher] Event Published: ${type}`);
    } catch (error) {
        console.error("[EventPublisher] Publish Error:", error);
    }
};

module.exports = publishEvent;