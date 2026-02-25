import path from 'path';
import fs from 'fs/promises';
import Project from '../models/Project.js';
import File from '../models/File.js';
import Feature from '../models/Feature.js';
import { getFileExtension } from '../utils/ignoreFolders.js';

const BATCH_SIZE = 20;

/**
 * Create a new project document in MongoDB.
 * Returns the created project.
 */
export async function createProject(userId, { name, description, uploadType }) {
  const project = await Project.create({
    userId,
    name: name || 'Untitled Project',
    description: description || '',
    uploadType,
    status: 'uploading',
    metadata: {
      uploadedAt: new Date(),
    },
  });
  console.log(`📦 Created project: ${project._id} (${project.name})`);
  return project;
}

/**
 * Store all valid source files into the files collection.
 * Reads files from disk, skips binaries/large files/minified.
 * Returns a Map<relativePath, fileDocId> for later reference.
 */
export async function storeFiles(projectId, userId, scannedFiles, projectPath) {
  const filePathToId = new Map();
  const fileDocs = [];

  for (const scannedFile of scannedFiles) {
    try {
      // Read file content from disk
      const absolutePath = path.resolve(projectPath, scannedFile.path);
      let content = null;
      let size = 0;
      let lineCount = 0;

      try {
        const stat = await fs.stat(absolutePath);
        size = stat.size;
        content = await fs.readFile(absolutePath, 'utf8');
        lineCount = content.split('\n').length;
      } catch (readErr) {
        // File might not exist on disk (e.g., was classified from scanner but missing)
        // Still store the metadata without content
        console.log(
          `⚠️  Could not read file: ${scannedFile.path} — ${readErr.message}`,
        );
      }

      const ext = getFileExtension(scannedFile.path);

      // Normalize to forward slashes for cross-platform consistency
      const normalizedPath = scannedFile.path.replace(/\\/g, '/');

      fileDocs.push({
        projectId,
        userId,
        path: normalizedPath,
        extension: ext,
        size,
        lineCount,
        content,
        analysis: buildAnalysis(scannedFile),
      });
    } catch (err) {
      console.error(
        `❌ Error processing file ${scannedFile.path}:`,
        err.message,
      );
    }
  }

  // Pre-validate each document individually so one bad doc never kills a batch.
  const validDocs = [];
  for (const doc of fileDocs) {
    try {
      const fileDoc = new File(doc);
      await fileDoc.validate();
      validDocs.push(doc);
    } catch (valErr) {
      console.error(
        `   ❌ Skipping invalid doc "${doc.path}": ${valErr.message}`,
      );
    }
  }

  if (validDocs.length < fileDocs.length) {
    console.warn(
      `⚠️  ${fileDocs.length - validDocs.length} files failed pre-validation (still storing ${validDocs.length})`,
    );
  }

  // Batch insert only pre-validated files
  console.log(
    `💾 Storing ${validDocs.length} files in batches of ${BATCH_SIZE}...`,
  );
  for (let i = 0; i < validDocs.length; i += BATCH_SIZE) {
    const batch = validDocs.slice(i, i + BATCH_SIZE);
    try {
      const inserted = await File.insertMany(batch, { ordered: false });
      for (const doc of inserted) {
        filePathToId.set(doc.path, doc._id);
      }
      console.log(
        `   ✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${inserted.length} files`,
      );
    } catch (err) {
      // Handle MongoDB-level errors (e.g., duplicate key on re-upload)
      // With pre-validation done above, errors here are write-level only.
      const successDocs = err.insertedDocs || err.result?.insertedDocs || [];
      for (const doc of successDocs) {
        if (doc?.path && doc?._id) {
          filePathToId.set(doc.path, doc._id);
        }
      }

      // Fallback: re-query MongoDB for docs that actually made it in
      if (successDocs.length === 0) {
        const batchPaths = batch.map((b) => b.path);
        try {
          const found = await File.find(
            { projectId, path: { $in: batchPaths } },
            { path: 1 },
          );
          for (const doc of found) {
            filePathToId.set(doc.path, doc._id);
          }
          if (found.length > 0) {
            console.log(
              `   🔄 Recovered ${found.length} files from batch ${Math.floor(i / BATCH_SIZE) + 1}`,
            );
          }
        } catch {
          // ignore recovery failure
        }
      }

      console.error(
        `   ⚠️ Batch ${Math.floor(i / BATCH_SIZE) + 1} partial: ${err.message}`,
      );
    }
  }

  console.log(
    `📁 Stored ${filePathToId.size}/${validDocs.length} files (scanned: ${scannedFiles.length}, valid: ${validDocs.length})`,
  );

  // Warn if files were lost
  if (filePathToId.size < scannedFiles.length) {
    console.warn(
      `⚠️ ${scannedFiles.length - filePathToId.size} files could not be stored in MongoDB`,
    );
  }

  return filePathToId;
}

/**
 * Store feature documents referencing file IDs.
 */
export async function storeFeatures(projectId, userId, features, filePathToId) {
  if (!features || Object.keys(features).length === 0) {
    console.log('📭 No features to store');
    return;
  }

  const featureDocs = [];

  for (const [keyword, feature] of Object.entries(features)) {
    // Resolve file paths to ObjectIds
    const fileIds = (feature.allFiles || [])
      .map((filePath) => filePathToId.get(filePath))
      .filter(Boolean);

    featureDocs.push({
      projectId,
      userId,
      name: feature.name || keyword,
      keyword: keyword.toLowerCase(),
      fileIds,
      fileCount: feature.fileCount || feature.allFiles?.length || 0,
      categorizedFiles: {
        frontend: feature.categorized?.frontend || [],
        backend: feature.categorized?.backend || [],
        shared: feature.categorized?.shared || [],
        models: feature.categorized?.models || [],
        routes: feature.categorized?.routes || [],
        controllers: feature.categorized?.controllers || [],
        pages: feature.categorized?.pages || [],
        components: feature.categorized?.components || [],
        api: feature.categorized?.api || [],
        utils: feature.categorized?.utils || [],
        middleware: feature.categorized?.middleware || [],
        config: feature.categorized?.config || [],
        stores: feature.categorized?.stores || [],
        services: feature.categorized?.services || [],
      },
      apiRoutes: (feature.apiRoutes || []).map((r) => ({
        method: r.method,
        path: r.path,
      })),
      sharedDependencies: feature.sharedDependencies || [],
    });
  }

  try {
    await Feature.insertMany(featureDocs, { ordered: false });
    console.log(`🏷️  Stored ${featureDocs.length} features`);
  } catch (err) {
    console.error(`⚠️ Feature storage partial: ${err.message}`);
  }
}

/**
 * Update the project document with stats, relationships, and finalize status.
 */
export async function finalizeProject(projectId, scanResult, fileCount) {
  const { metadata, relationships, features } = scanResult;
  const startTime = Date.now();

  await Project.findByIdAndUpdate(projectId, {
    status: 'ready',
    stats: {
      totalFiles: fileCount,
      projectType: metadata?.projectType || '',
      frameworks: {
        backend: metadata?.frameworks?.backend || [],
        frontend: metadata?.frameworks?.frontend || [],
        database: metadata?.frameworks?.database || [],
        tooling: metadata?.frameworks?.tooling || [],
      },
      relationshipStats: {
        totalRelationships:
          metadata?.relationshipStats?.totalRelationships || 0,
        importRelationships:
          metadata?.relationshipStats?.importRelationships || 0,
        usesRelationships: metadata?.relationshipStats?.usesRelationships || 0,
        filesInGraph: metadata?.relationshipStats?.filesInGraph || 0,
      },
      featureCount: features ? Object.keys(features).length : 0,
    },
    relationships: (relationships || []).map((r) => ({
      from: r.from,
      to: r.to,
      type: r.type,
    })),
    metadata: {
      uploadedAt: new Date(),
      scanCompletedAt: new Date(),
      analysisCompletedAt: new Date(),
      processingTimeMs: Date.now() - startTime,
    },
  });

  console.log(`✅ Project ${projectId} finalized — status: ready`);
}

/**
 * Mark project as failed with an error message.
 */
export async function failProject(projectId, errorMessage) {
  try {
    await Project.findByIdAndUpdate(projectId, {
      status: 'failed',
      'metadata.errorMessage': errorMessage,
    });
    console.log(`❌ Project ${projectId} marked as failed: ${errorMessage}`);
  } catch (err) {
    console.error(`❌ Could not mark project as failed:`, err.message);
  }
}

/**
 * Clean up all data for a project (used on failure/retry).
 */
export async function cleanupProject(projectId) {
  await Promise.all([
    File.deleteMany({ projectId }),
    Feature.deleteMany({ projectId }),
  ]);
  console.log(`🧹 Cleaned up files and features for project ${projectId}`);
}

// ─── HELPERS ───────────────────────────────────────────────────────────

/**
 * Normalize routes to always be an array of { method, path } objects.
 * Handles: objects, plain strings, or any unexpected shape.
 */
function normalizeRoutes(routes) {
  if (!Array.isArray(routes)) return [];
  return routes.map((r) => {
    if (typeof r === 'string') return { method: '', path: r };
    if (r && typeof r === 'object')
      return { method: r.method || '', path: r.path || '' };
    return { method: '', path: String(r) };
  });
}

/**
 * Build the analysis sub-document from a scanned file object.
 * Maps the scanner output shape to the File model's analysis schema.
 */
function buildAnalysis(scannedFile) {
  return {
    type: scannedFile.type || 'unknown',
    role: scannedFile.role || 'Unknown',
    category: scannedFile.category || 'infrastructure',
    behavior: scannedFile.behavior || 'logic',
    routes: normalizeRoutes(
      scannedFile.routes || scannedFile.analysis?.routes || [],
    ),
    imports: {
      count:
        scannedFile.imports?.count ??
        scannedFile.analysis?.imports?.length ??
        0,
      files:
        scannedFile.imports?.files ??
        scannedFile.analysis?.resolvedImports ??
        [],
      items: (
        scannedFile.imports?.items ??
        scannedFile.analysis?.imports ??
        []
      ).map((imp) => ({
        path: imp.path || '',
        value: imp.value || imp.path || '',
        type: imp.type || 'esm',
        imported: imp.imported || [],
        resolvedPath: imp.resolvedPath || null,
      })),
    },
    importedBy:
      scannedFile.importedBy ?? scannedFile.analysis?.importedBy ?? [],
    exportsCount:
      scannedFile.exportsCount ??
      (scannedFile.exports || scannedFile.analysis?.exports || []).length,
    exports: (scannedFile.exports ?? scannedFile.analysis?.exports ?? []).map(
      (exp) => ({
        type: exp.type || 'es_named',
        name: exp.name || '',
        kind: exp.kind || 'unknown',
      }),
    ),
  };
}
