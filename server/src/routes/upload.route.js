import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  handleZipUpload,
  handleGitUpload,
} from '../controllers/upload.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || './src/temp';
const uploadsPath = path.resolve(uploadDir);

console.log(`📂 Upload directory: ${uploadsPath}`);
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
  console.log(`✅ Created upload directory`);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log(`📥 Storing file: ${file.originalname}`);
    cb(null, uploadsPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = uniqueSuffix + path.extname(file.originalname);
    console.log(`💾 Filename: ${filename}`);
    cb(null, filename);
  },
});

// File filter to only accept ZIP files
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const isZip =
      file.mimetype === 'application/zip' ||
      file.mimetype === 'application/x-zip-compressed' ||
      file.mimetype === 'application/x-zip' ||
      file.mimetype === 'application/octet-stream' ||
      file.originalname.toLowerCase().endsWith('.zip');

    if (isZip) {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed'), false);
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

// Wrap multer middleware to handle errors properly
const uploadMiddleware = (req, res, next) => {
  console.log('\n🔄 Upload middleware started');

  upload.single('project')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error(`❌ Multer error: ${err.code} - ${err.message}`);
      return res.status(400).json({
        success: false,
        error:
          err.code === 'LIMIT_FILE_SIZE'
            ? 'File too large (max 100MB)'
            : `Upload error: ${err.message}`,
      });
    } else if (err) {
      console.error(`❌ Upload error: ${err.message}`);
      return res.status(400).json({ success: false, error: err.message });
    }

    console.log(
      `✅ Multer complete, file: ${req.file ? req.file.originalname : 'none'}`,
    );
    next();
  });
};

router.post('/upload', authenticate, uploadMiddleware, handleZipUpload);
router.post('/upload-git', authenticate, handleGitUpload);

export default router;
