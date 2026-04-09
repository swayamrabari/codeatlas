import AdmZip from 'adm-zip';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger.js';

/**
 * Extract a ZIP file to a destination directory
 */
export async function extractZip(zipPath, destDir) {
  logger.info('Extracting ZIP file');
  logger.info(`ZIP source: ${zipPath}`);
  logger.info(`ZIP destination: ${destDir}`);

  // Ensure destination exists
  await fs.mkdir(destDir, { recursive: true });

  try {
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();
    logger.info(`Entries in ZIP: ${entries.length}`);

    zip.extractAllTo(destDir, true);
    logger.info('ZIP extraction complete');

    // Find project root (handle case where ZIP contains a single root folder)
    const dirEntries = await fs.readdir(destDir);
    logger.info(`Top-level extracted items: ${dirEntries.join(', ')}`);

    if (dirEntries.length === 1) {
      const singleEntry = path.join(destDir, dirEntries[0]);
      const stat = await fs.stat(singleEntry);

      if (stat.isDirectory()) {
        logger.info(`Project root detected at ${singleEntry}`);
        return singleEntry;
      }
    }

    logger.info(`Project root detected at ${destDir}`);
    return destDir;
  } catch (err) {
    logger.error('ZIP extraction error', err.message);
    throw err;
  }
}

/**
 * Clean up uploaded ZIP file
 */
export async function cleanupZip(zipPath) {
  try {
    await fs.unlink(zipPath);
    logger.info('Cleaned up ZIP file');
  } catch (err) {
    logger.warn('Could not clean up ZIP file', err.message);
  }
}

/**
 * Validate uploaded file is a ZIP
 */
export function isValidZip(filePath) {
  try {
    logger.info(`Validating ZIP: ${filePath}`);
    const zip = new AdmZip(filePath);
    const entries = zip.getEntries();
    logger.info(`ZIP validation found ${entries.length} entries`);
    return entries.length > 0;
  } catch (err) {
    logger.error(`ZIP validation error: ${err.message}`);
    return false;
  }
}
