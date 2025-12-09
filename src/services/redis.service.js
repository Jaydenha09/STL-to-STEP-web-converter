const redis = require('redis');
const config = require('../config');

class RedisService {
  constructor() {
    this.client = null;
  }

  async connect() {
    this.client = redis.createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
    });

    this.client.on('error', (err) => console.error('Redis Client Error', err));
    await this.client.connect();
    console.log('Redis connected');
  }

  async createJob(jobId, data) {
    const job = {
      ...data,
      createdAt: Date.now(),
      expiresAt: Date.now() + (config.jobs.ttl * 1000),
    };
    await this.client.setEx(
      `job:${jobId}`,
      config.jobs.ttl,
      JSON.stringify(job)
    );
    return job;
  }

  async getJob(jobId) {
    const data = await this.client.get(`job:${jobId}`);
    if (!data) return null;
    
    const job = JSON.parse(data);
    const ttl = await this.client.ttl(`job:${jobId}`);
    
    return {
      ...job,
      remainingTTL: ttl > 0 ? ttl : 0,
    };
  }

  async updateJob(jobId, updates) {
    const job = await this.getJob(jobId);
    if (!job) return null;
    
    const updatedJob = { ...job, ...updates };
    const ttl = await this.client.ttl(`job:${jobId}`);
    
    await this.client.setEx(
      `job:${jobId}`,
      ttl > 0 ? ttl : config.jobs.ttl,
      JSON.stringify(updatedJob)
    );
    
    return updatedJob;
  }

  async deleteJob(jobId) {
    await this.client.del(`job:${jobId}`);
  }

  async getAllJobKeys() {
    return await this.client.keys('job:*');
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
    }
  }
}

module.exports = new RedisService();