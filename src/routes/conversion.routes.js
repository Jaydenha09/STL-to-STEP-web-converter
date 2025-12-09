const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const config = require('../config');
const converterService = require('../services/converter.service');
const redisService = require('../services/redis.service');
const fileService = require('../services/file.service');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.upload.dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxSize },
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() !== '.stl') {
      return cb(new Error('Only STL files are allowed'));
    }
    cb(null, true);
  },
});

// Upload and convert STL to STEP
router.post('/convert', upload.single('stlFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const jobId = uuidv4();
    const inputPath = req.file.path;
    const outputFilename = `${path.parse(req.file.filename).name}.step`;
    const outputPath = fileService.getOutputPath(outputFilename);

    // Create job in Redis
    await redisService.createJob(jobId, {
      jobId,
      status: 'processing',
      originalFilename: req.file.originalname,
      inputPath,
      outputPath,
      outputFilename,
    });

    // Perform conversion
    try {
      await converterService.convertSTLtoSTEP(inputPath, outputPath);
      
      await redisService.updateJob(jobId, {
        status: 'completed',
        completedAt: Date.now(),
      });

      res.json({
        success: true,
        jobId,
        message: 'Conversion completed successfully',
      });
    } catch (conversionError) {
      await redisService.updateJob(jobId, {
        status: 'failed',
        error: conversionError.message,
      });

      res.status(500).json({
        success: false,
        jobId,
        error: 'Conversion failed',
        details: conversionError.message,
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get job status
router.get('/job/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await redisService.getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found or expired' });
    }

    const expiresIn = Math.max(0, Math.floor(job.remainingTTL));
    
    res.json({
      jobId: job.jobId,
      status: job.status,
      originalFilename: job.originalFilename,
      expiresIn,
      expiresAt: new Date(job.expiresAt).toISOString(),
      createdAt: new Date(job.createdAt).toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download converted file
router.get('/download/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await redisService.getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found or expired' });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({ 
        error: `Cannot download: job status is ${job.status}` 
      });
    }

    const exists = await fileService.fileExists(job.outputPath);
    if (!exists) {
      return res.status(404).json({ error: 'Converted file not found' });
    }

    res.download(job.outputPath, job.outputFilename);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;