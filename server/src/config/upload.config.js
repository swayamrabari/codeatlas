import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';

const uploadsPath = path.resolve(process.env.UPLOAD_DIR || './src/temp');

if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
  logger.info('Created upload directory');
}

logger.info('Upload directory configured', { path: uploadsPath });

export const uploadConfig = {
  uploadsPath,
  maxFileSize: 100 * 1024 * 1024,
};
