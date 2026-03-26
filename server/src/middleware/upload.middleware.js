import multer from 'multer';
import path from 'path';
import { uploadConfig } from '../config/upload.config.js';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log(`📥 Storing file: ${file.originalname}`);
    cb(null, uploadConfig.uploadsPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = uniqueSuffix + path.extname(file.originalname);
    console.log(`💾 Filename: ${filename}`);
    cb(null, filename);
  },
});

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
      return;
    }

    cb(new Error('Only ZIP files are allowed'), false);
  },
  limits: {
    fileSize: uploadConfig.maxFileSize,
  },
});

export function uploadProjectZip(req, res, next) {
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
    }

    if (err) {
      console.error(`❌ Upload error: ${err.message}`);
      return res.status(400).json({ success: false, error: err.message });
    }

    console.log(
      `✅ Multer complete, file: ${req.file ? req.file.originalname : 'none'}`,
    );
    return next();
  });
}
