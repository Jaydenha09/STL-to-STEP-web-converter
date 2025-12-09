module.exports = {
  port: process.env.PORT || 3000,
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  },
  upload: {
    dir: './uploads',
    maxSize: 50 * 1024 * 1024, // 50MB
  },
  output: {
    dir: './converted',
  },
  jobs: {
    ttl: 3600, // 1 hour in seconds
    cleanupCron: '*/15 * * * *', // Every 15 minutes
  },
};