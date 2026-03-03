const { RateLimiterRedis } = require('rate-limiter-flexible');
const { producer } = require('../events/eventBus');

const generalLimiter = new RateLimiterRedis({
    storeClient: producer,
    keyPrefix: 'middleware_general',
    points: 50,    
    duration: 1,   
});

const authLimiter = new RateLimiterRedis({
    storeClient: producer,
    keyPrefix: 'middleware_auth',
    points: 20,    
    duration: 60,  
});

const llmLimiter = new RateLimiterRedis({
    storeClient: producer,
    keyPrefix: 'middleware_llm',
    points: 60,    
    duration: 60,  
});

const rateLimiterMiddleware = (req, res, next) => {
    let limiter = generalLimiter;

    if (req.path.startsWith('/auth')) {
        limiter = authLimiter;
    } else if (req.path.startsWith('/brain') || req.path.startsWith('/agent') || req.path.startsWith('/memory')) {
        limiter = llmLimiter;
    }

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