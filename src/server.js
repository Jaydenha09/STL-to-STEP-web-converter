const express = require('express');
const path = require('path');
const config = require('./config');
const redisService = require('./services/redis.service');
const fileService = require('./services/file.service');
const cleanupService = require('./services/cleanup.service');
const conversionRoutes = require('./routes/conversion.routes');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api', conversionRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'File too large',
        maxSize: `${config.upload.maxSize / (1024 * 1024)}MB`,
      });
    }
  }
  
  res.status(500).json({ 
    error: err.message || 'Internal server error' 
  });
});

// Initialize and start server
async function start() {
  try {
    // Ensure directories exist
    await fileService.ensureDirectories();
    console.log('Directories initialized');

    // Connect to Redis
    await redisService.connect();

    // Start cleanup scheduler
    cleanupService.start();

    // Start server
    app.listen(config.port, () => {
      console.log(`Server running on http://localhost:${config.port}`);
      console.log(`Upload max size: ${config.upload.maxSize / (1024 * 1024)}MB`);
      console.log(`File TTL: ${config.jobs.ttl}s`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  cleanupService.stop();
  await redisService.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  cleanupService.stop();
  await redisService.disconnect();
  process.exit(0);
});

start();