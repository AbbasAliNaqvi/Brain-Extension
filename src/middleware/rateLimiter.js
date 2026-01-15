const { RateLimiterRedis } = require('rate-limiter-flexible');

const { producer } = require('../events/eventBus');

const generalLimiter = new RateLimiterRedis({
    storeClient: producer,
    keyPrefix: 'middleware_general',
    points: 20,
    duration: 1,
});

const authLimiter = new RateLimiterRedis({
    storeClient: producer,
    keyPrefix: 'middleware_auth',
    points: 5,
    duration: 60,
});

const rateLimiterMiddleware = (req, res, next) => {
    const limiter = req.path.startsWith('/auth') ? authLimiter : generalLimiter;

    limiter.consume(req.ip)
        .then(() => {
            next();
        })
        .catch(() => {
            res.status(429).json({
                status: "ERROR",
                message: "Too Many Requests"
            });
        });
};

module.exports = rateLimiterMiddleware;