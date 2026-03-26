import fs from 'fs';
import path from 'path';

const uploadsPath = path.resolve(process.env.UPLOAD_DIR || './src/temp');

if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
  console.log('✅ Created upload directory');
}

console.log(`📂 Upload directory: ${uploadsPath}`);

export const uploadConfig = {
  uploadsPath,
  maxFileSize: 100 * 1024 * 1024,
};
