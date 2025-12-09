const fs = require('fs').promises;
const path = require('path');
const config = require('../config');

class FileService {
  async ensureDirectories() {
    await fs.mkdir(config.upload.dir, { recursive: true });
    await fs.mkdir(config.output.dir, { recursive: true });
  }

  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error(`Failed to delete file ${filePath}:`, error.message);
      return false;
    }
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  getUploadPath(filename) {
    return path.join(config.upload.dir, filename);
  }

  getOutputPath(filename) {
    return path.join(config.output.dir, filename);
  }

  async cleanupJobFiles(inputPath, outputPath) {
    const results = await Promise.allSettled([
      this.deleteFile(inputPath),
      this.deleteFile(outputPath),
    ]);
    
    return {
      inputDeleted: results[0].status === 'fulfilled' && results[0].value,
      outputDeleted: results[1].status === 'fulfilled' && results[1].value,
    };
  }

  async getExpiredFiles() {
    const now = Date.now();
    const expiredFiles = [];

    for (const dir of [config.upload.dir, config.output.dir]) {
      try {
        const files = await fs.readdir(dir);
        
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stats = await fs.stat(filePath);
          const age = now - stats.mtimeMs;
          
          if (age > config.jobs.ttl * 1000) {
            expiredFiles.push(filePath);
          }
        }
      } catch (error) {
        console.error(`Error scanning directory ${dir}:`, error.message);
      }
    }

    return expiredFiles;
  }
}

module.exports = new FileService();