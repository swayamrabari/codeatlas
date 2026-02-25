import AdmZip from 'adm-zip';
import fs from 'fs/promises';
import path from 'path';

/**
 * Extract a ZIP file to a destination directory
 */
export async function extractZip(zipPath, destDir) {
  console.log('📦 Extracting ZIP file...');
  console.log(`   Source: ${zipPath}`);
  console.log(`   Destination: ${destDir}`);

  // Ensure destination exists
  await fs.mkdir(destDir, { recursive: true });

  try {
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();
    console.log(`   Entries in ZIP: ${entries.length}`);

    zip.extractAllTo(destDir, true);
    console.log('   Extraction complete');

    // Find project root (handle case where ZIP contains a single root folder)
    const dirEntries = await fs.readdir(destDir);
    console.log(`   Top-level items: ${dirEntries.join(', ')}`);

    if (dirEntries.length === 1) {
      const singleEntry = path.join(destDir, dirEntries[0]);
      const stat = await fs.stat(singleEntry);

      if (stat.isDirectory()) {
        console.log(`✅ Project root: ${singleEntry}`);
        return singleEntry;
      }
    }

    console.log(`✅ Project root: ${destDir}`);
    return destDir;
  } catch (err) {
    console.error('❌ Extraction error:', err.message);
    throw err;
  }
}

/**
 * Clean up uploaded ZIP file
 */
export async function cleanupZip(zipPath) {
  try {
    await fs.unlink(zipPath);
    console.log('🧹 Cleaned up ZIP file');
  } catch (err) {
    console.warn('⚠️ Could not clean up ZIP file:', err.message);
  }
}

/**
 * Validate uploaded file is a ZIP
 */
export function isValidZip(filePath) {
  try {
    console.log(`🔍 Validating ZIP: ${filePath}`);
    const zip = new AdmZip(filePath);
    const entries = zip.getEntries();
    console.log(`   Found ${entries.length} entries`);
    return entries.length > 0;
  } catch (err) {
    console.error(`❌ ZIP validation error: ${err.message}`);
    return false;
  }
}
