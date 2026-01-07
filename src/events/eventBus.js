const Redis = require('ioredis');

const connectionUrl = `rediss://default:${process.env.UPSTASH_REDIS_REST_TOKEN}@${process.env.UPSTASH_REDIS_REST_URL.replace('https://', '')}`;

const producer = new Redis(process.env.REDIS_URL || connectionUrl);
const consumer = new Redis(process.env.REDIS_URL || connectionUrl);

producer.on("connect", () => console.log("[EventBus] Producer connected to Redis"));
consumer.on("connect", () => console.log("[EventBus] Consumer connected to Redis"));

module.exports = {
    producer,
    consumer
};