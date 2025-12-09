const cron = require('node-cron');
const config = require('../config');
const redisService = require('./redis.service');
const fileService = require('./file.service');

class CleanupService {
  constructor() {
    this.job = null;
  }

  start() {
    console.log(`Starting cleanup scheduler: ${config.jobs.cleanupCron}`);
    
    this.job = cron.schedule(config.jobs.cleanupCron, async () => {
      console.log('Running cleanup job...');
      await this.cleanup();
    });
  }

  stop() {
    if (this.job) {
      this.job.stop();
      console.log('Cleanup scheduler stopped');
    }
  }

  async cleanup() {
    try {
      const stats = {
        filesDeleted: 0,
        jobsDeleted: 0,
        errors: 0,
      };

      // Clean up expired jobs from Redis
      const jobKeys = await redisService.getAllJobKeys();
      
      for (const key of jobKeys) {
        const jobId = key.replace('job:', '');
        const job = await redisService.getJob(jobId);
        
        if (!job || job.remainingTTL <= 0) {
          // Clean up associated files
          if (job) {
            const deleted = await fileService.cleanupJobFiles(
              job.inputPath,
              job.outputPath
            );
            
            if (deleted.inputDeleted) stats.filesDeleted++;
            if (deleted.outputDeleted) stats.filesDeleted++;
          }
          
          await redisService.deleteJob(jobId);
          stats.jobsDeleted++;
        }
      }

      // Clean up orphaned files (files without jobs)
      const expiredFiles = await fileService.getExpiredFiles();
      
      for (const filePath of expiredFiles) {
        const deleted = await fileService.deleteFile(filePath);
        if (deleted) stats.filesDeleted++;
        else stats.errors++;
      }

      console.log('Cleanup completed:', stats);
      return stats;
    } catch (error) {
      console.error('Cleanup error:', error);
      throw error;
    }
  }

  async manualCleanup() {
    return await this.cleanup();
  }
}

module.exports = new CleanupService();