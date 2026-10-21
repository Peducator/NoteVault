const Redis = require('ioredis');
const config = require('./env');

const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  // Tự động kết nối lại nếu gián đoạn
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  lazyConnect: true,
});

redis.on('error', (err) => {
  console.warn('[Redis Warning]', err.message);
});

module.exports = redis;
