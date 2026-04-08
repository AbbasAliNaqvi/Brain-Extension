const EventEmitter = require('events');

class BrainEventBus extends EventEmitter {}
const eventBus = new BrainEventBus();

console.log("[EventBus] Local In-Memory Event Bus Initialized");

module.exports = {
    eventBus,
    producer: eventBus,
    consumer: eventBus 
};