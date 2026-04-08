const { eventBus } = require("./eventBus");

const STREAM_KEY = "BRAIN_STREAM";

const publishEvent = async (type, payload) => {
    try {
        eventBus.emit(STREAM_KEY, { type, data: payload });
        console.log(`[EventPublisher] Local Event Published: ${type}`);
    } catch (error) {
        console.error("[EventPublisher] Publish Error:", error);
    }
};

module.exports = publishEvent;