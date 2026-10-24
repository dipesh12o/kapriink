// In-memory sliding window rate limiter
const store = new Map();

// Periodic cleanup every 5 minutes to prevent memory accumulation
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (now > record.resetTime) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

const createRateLimiter = ({ windowMs, max, message, keyGenerator }) => {
  return (req, res, next) => {
    const key = keyGenerator ? keyGenerator(req) : req.ip || "unknown";
    const now = Date.now();

    let record = store.get(key);
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      store.set(key, record);
      return next();
    }

    if (record.count >= max) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.set("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({
        message: message || "Too many requests. Please try again later.",
        retryAfter: retryAfterSeconds
      });
    }

    record.count += 1;
    next();
  };
};

// Verification rate limiter: max 3 requests per 5 minutes per email/IP
const verificationLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 3,
  message: "Too many verification requests. Please wait a few minutes before trying again.",
  keyGenerator: (req) => {
    const email = req.body && req.body.email ? String(req.body.email).trim().toLowerCase() : "";
    const ip = req.ip || req.headers["x-forwarded-for"] || "ip";
    return `verify_${ip}_${email}`;
  }
});

// Bid rate limiter: max 10 bids per 1 minute per IP/email
const bidLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: "Too many bids submitted in a short time. Please slow down and try again.",
  keyGenerator: (req) => {
    const email = req.bidder ? req.bidder.email : (req.body?.email || "");
    const ip = req.ip || req.headers["x-forwarded-for"] || "ip";
    return `bid_${ip}_${email}`;
  }
});

module.exports = {
  verificationLimiter,
  bidLimiter
};
