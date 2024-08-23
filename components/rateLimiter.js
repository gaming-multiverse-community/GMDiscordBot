const rateLimits = new Map();
const RATE_LIMIT_TIME = 10000;
const MAX_REQUESTS = 5;

function isRateLimited(userId) {
    const userRateLimit = rateLimits.get(userId) || { count: 0, lastInteraction: Date.now() };
    const now = Date.now();

    if (now - userRateLimit.lastInteraction < RATE_LIMIT_TIME) {
        userRateLimit.count++;
    } else {
        userRateLimit.count = 1;
        userRateLimit.lastInteraction = now;
    }

    if (userRateLimit.count > MAX_REQUESTS) {
        return true;
    }

    rateLimits.set(userId, userRateLimit);
    return false;
}

module.exports = {
    isRateLimited
};
