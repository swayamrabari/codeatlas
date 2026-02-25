import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';
import { extractZip, cleanupZip, isValidZip } from '../services/zip.service.js';
import {
  cloneRepository,
  isValidGitUrl,
  getRepoName,
} from '../services/git.service.js';
import { scanProject } from '../services/scan.service.js';
import {
  createProject,
  storeFiles,
  storeFeatures,
  finalizeProject,
  failProject,
} from '../services/storage.service.js';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './src/temp';

/**
 * Build the response-format file objects from scan results.
 * Matches demoOutput.json shape for backward-compat with the frontend.
 * Normalizes paths to forward slashes for cross-platform consistency.
 */
function buildFileResponse(files) {
  return files.map((f) => ({
    path: f.path.replace(/\\/g, '/'),
    type: f.type,
    role: f.role,
    category: f.category,
    behavior: f.behavior,
    routes: f.analysis?.routes || [],
    imports: {
      count: f.analysis?.imports?.length || 0,
      files: (f.analysis?.resolvedImports || []).map((p) =>
        p.replace(/\\/g, '/'),
      ),
      items: f.analysis?.imports || [],
    },
    importedBy: (f.analysis?.importedBy || []).map((p) =>
      p.replace(/\\/g, '/'),
    ),
    exportsCount: (f.analysis?.exports || []).length,
    exports: f.analysis?.exports || [],
  }));
}

/**
 * Handle ZIP file upload — scans and persists to MongoDB.
 */
export async function handleZipUpload(req, res) {
  const tempId = randomUUID();
  let project = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        details: 'Please select a ZIP file to upload',
      });
    }

    const zipPath = req.file.path;

    if (!isValidZip(zipPath)) {
      await cleanupZip(zipPath);
      return res.status(400).json({
        success: false,
        error: 'Invalid ZIP file',
        details: 'The uploaded file is not a valid ZIP archive',
      });
    }

    // Get userId from auth middleware
    const userId = req.user._id;
    const projectName =
      req.body.name ||
      req.file.originalname.replace(/\.zip$/i, '') ||
      'Untitled Project';

    // Step 1: Create project in MongoDB
    project = await createProject(userId, {
      name: projectName,
      description: req.body.description || '',
      uploadType: 'zip',
    });
    const projectId = project._id;

    // Step 2: Extract ZIP
    const extractDir = path.resolve(UPLOAD_DIR, 'projects', tempId);
    const projectPath = await extractZip(zipPath, extractDir);
    await cleanupZip(zipPath);

    // Step 3: Scan and analyze
    await project.updateOne({ status: 'scanning' });
    const scanResult = await scanProject(projectPath);
    const { files, metadata, relationships, features } = scanResult;

    const responseFiles = buildFileResponse(files);

    // Step 4: Store files in MongoDB (with source content from disk)
    await project.updateOne({ status: 'analyzing' });
    const filePathToId = await storeFiles(
      projectId,
      userId,
      responseFiles,
      projectPath,
    );

    // Step 5: Store features referencing file IDs
    await storeFeatures(projectId, userId, features, filePathToId);

    // Step 6: Finalize project with stats + relationships
    await finalizeProject(projectId, scanResult, files.length);

    // Build response
    const response = {
      success: true,
      projectId: projectId.toString(),
      message: 'Project uploaded and analyzed successfully',
      data: {
        totalFiles: files.length,
        frameworks: metadata.frameworks,
        projectType: metadata.projectType,
        relationshipStats: metadata.relationshipStats || null,
        relationships: relationships || [],
        features: features || {},
        files: responseFiles,
      },
    };

    // Log feature summary
    console.log('\n=== DETECTED FEATURES ===');
    Object.entries(features || {})
      .sort((a, b) => b[1].fileCount - a[1].fileCount)
      .forEach(([name, feature]) => {
        console.log(`📦 ${name.toUpperCase()} — ${feature.fileCount} files`);
      });
    console.log('');

    // Cleanup temp files from disk (data is in MongoDB now)
    cleanupTempFiles(extractDir);

    return res.status(200).json(response);
  } catch (err) {
    console.error('Upload error:', err.message);

    if (project?._id) {
      await failProject(project._id, err.message);
    }

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: 'Failed to process upload',
        message: err.message,
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      });
    }
  }
}

/**
 * Handle Git repository upload — clones, scans and persists to MongoDB.
 */
export async function handleGitUpload(req, res) {
  const tempId = randomUUID();
  let project = null;

  try {
    const { gitUrl } = req.body;

    if (!gitUrl) {
      return res
        .status(400)
        .json({ success: false, error: 'Git URL is required' });
    }

    const trimmedUrl = gitUrl.trim();

    if (!isValidGitUrl(trimmedUrl)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Git URL format',
        hint: 'Please use a valid GitHub/GitLab URL like https://github.com/user/repo',
      });
    }

    // Get userId from auth middleware
    const userId = req.user._id;
    const repoName = getRepoName(trimmedUrl);

    // Step 1: Create project in MongoDB
    project = await createProject(userId, {
      name: req.body.name || repoName || 'Git Project',
      description: req.body.description || `Cloned from ${trimmedUrl}`,
      uploadType: 'github',
    });
    const projectId = project._id;

    // Step 2: Clone repository
    const cloneDir = path.resolve(UPLOAD_DIR, 'projects', tempId);
    const projectPath = await cloneRepository(trimmedUrl, cloneDir);

    // Step 3: Scan and analyze
    await project.updateOne({ status: 'scanning' });
    const scanResult = await scanProject(projectPath);
    const { files, metadata, relationships, features } = scanResult;

    const responseFiles = buildFileResponse(files);

    // Step 4: Store files in MongoDB
    await project.updateOne({ status: 'analyzing' });
    const filePathToId = await storeFiles(
      projectId,
      userId,
      responseFiles,
      projectPath,
    );

    // Step 5: Store features
    await storeFeatures(projectId, userId, features, filePathToId);

    // Step 6: Finalize
    await finalizeProject(projectId, scanResult, files.length);

    const response = {
      success: true,
      projectId: projectId.toString(),
      repoName,
      message: 'Repository cloned and analyzed successfully',
      data: {
        totalFiles: files.length,
        frameworks: metadata.frameworks,
        projectType: metadata.projectType,
        relationshipStats: metadata.relationshipStats || null,
        relationships: relationships || [],
        features: features || {},
        files: responseFiles,
      },
    };

    // Log feature summary
    console.log('\n=== DETECTED FEATURES ===');
    Object.entries(features || {})
      .sort((a, b) => b[1].fileCount - a[1].fileCount)
      .forEach(([name, feature]) => {
        console.log(`📦 ${name.toUpperCase()} — ${feature.fileCount} files`);
      });
    console.log('');

    // Cleanup temp files
    cleanupTempFiles(cloneDir);

    return res.status(200).json(response);
  } catch (err) {
    console.error('Git upload error:', err.message);

    if (project?._id) {
      await failProject(project._id, err.message);
    }

    if (!res.headersSent) {
      const statusCode = err.message.includes('not found') ? 404 : 500;
      return res.status(statusCode).json({
        success: false,
        error: 'Failed to clone repository',
        message: err.message,
      });
    }
  }
}

/**
 * Clean up temporary extracted/cloned files from disk.
 * Runs asynchronously — doesn't block the response.
 */
function cleanupTempFiles(dirPath) {
  fs.rm(dirPath, { recursive: true, force: true })
    .then(() => console.log(`🧹 Cleaned up temp: ${dirPath}`))
    .catch((err) => console.error(`⚠️ Temp cleanup failed: ${err.message}`));
}
