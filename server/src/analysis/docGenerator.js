import File from '../models/File.js';
import Feature from '../models/Feature.js';
import Project from '../models/Project.js';
import {
  generateFileDoc,
  generateFeatureDoc,
  generateProjectDoc,
} from './ai.service.js';
import { storeEmbeddings } from './embeddingStore.js';
import progressEmitter from './progressEmitter.js';
import { logger } from '../utils/logger.js';

// ─────────────────────────────────────────────
// ── Selective Regeneration (single item)    ──
// ─────────────────────────────────────────────

/**
 * Regenerate AI documentation for a SINGLE file.
 * @param {string} fileId - MongoDB File _id
 * @returns {Object} Updated aiDocumentation
 */
export async function regenerateSingleFileDoc(fileId) {
  const file = await File.findById(fileId).lean();
  if (!file) throw new Error(`File ${fileId} not found`);

  const project = await Project.findById(file.projectId).lean();
  if (!project) throw new Error(`Project ${file.projectId} not found`);

  const tier = file.analysis?.tier ?? 3;
  const projectType = project.stats?.projectType || 'unknown';
  const projectFrameworks = project.stats?.frameworks || {};

  const fileData = {
    path: file.path,
    type: file.analysis?.type || 'unknown',
    role: file.analysis?.role || 'Unknown',
    category: file.analysis?.category || 'infrastructure',
    behavior: file.analysis?.behavior || 'logic',
    routes: file.analysis?.routes || [],
    imports: file.analysis?.imports || {},
    importedBy: file.analysis?.importedBy || [],
    exports: file.analysis?.exports || [],
    projectType,
    projectFrameworks,
  };

  if (tier <= 2) {
    fileData.fileContent = file.content || '';
  }

  logger.info(`[DocGen] Regenerating file doc: ${file.path} (tier ${tier})`);
  const doc = await generateFileDoc(fileData, tier);

  const update = { shortSummary: doc.shortSummary };
  if (tier <= 2) {
    update.detailedSummary = doc.detailedSummary || null;
    update.mermaidDiagram = doc.mermaidDiagram || null;
    update.searchTags = doc.searchTags || [];
  }

  await File.updateOne({ _id: fileId }, { aiDocumentation: update });
  logger.info(`[DocGen] File doc regenerated: ${file.path}`);
  return update;
}

/**
 * Regenerate AI documentation for a SINGLE feature.
 * @param {string} featureId - MongoDB Feature _id
 * @returns {Object} Updated aiDocumentation
 */
export async function regenerateSingleFeatureDoc(featureId) {
  const feature = await Feature.findById(featureId).populate({
    path: 'fileIds',
    select:
      'path analysis.role analysis.category analysis.tier aiDocumentation.shortSummary',
  });
  if (!feature) throw new Error(`Feature ${featureId} not found`);

  const project = await Project.findById(feature.projectId).lean();
  if (!project) throw new Error(`Project ${feature.projectId} not found`);

  const projectType = project.stats?.projectType || 'unknown';
  const projectFrameworks = project.stats?.frameworks || {};

  const featureContext = (feature.fileIds || []).map((f) => ({
    path: f.path,
    role: f.analysis?.role || 'Unknown',
    category: f.analysis?.category || 'infrastructure',
    tier: f.analysis?.tier ?? 3,
    shortSummary: f.aiDocumentation?.shortSummary || null,
  }));

  logger.info(`[DocGen] Regenerating feature doc: ${feature.name}`);
  const doc = await generateFeatureDoc(
    feature.name,
    featureContext,
    projectType,
    projectFrameworks,
  );

  const aiDoc = {
    shortSummary: doc.shortSummary,
    detailedSummary: doc.detailedSummary || null,
    mermaidDiagram: doc.mermaidDiagram || null,
    searchTags: doc.searchTags || [],
  };

  await Feature.updateOne({ _id: featureId }, { aiDocumentation: aiDoc });
  logger.info(`[DocGen] Feature doc regenerated: ${feature.name}`);
  return aiDoc;
}

/**
 * Regenerate AI documentation for the PROJECT OVERVIEW only.
 * @param {string} projectId - MongoDB Project _id
 * @returns {Object} Updated aiDocumentation
 */
export async function regenerateProjectOverviewDoc(projectId) {
  const project = await Project.findById(projectId).lean();
  if (!project) throw new Error(`Project ${projectId} not found`);

  const projectType = project.stats?.projectType || 'unknown';
  const projectFrameworks = project.stats?.frameworks || {};

  const entryPoints = await File.find(
    { projectId, 'analysis.type': 'entry-point' },
    { path: 1 },
  ).lean();

  const features = await Feature.find(
    { projectId },
    { name: 1, 'aiDocumentation.shortSummary': 1 },
  ).lean();

  const projectContext = {
    metadata: {
      projectType,
      projectFrameworks,
      entryPoints: entryPoints.map((f) => f.path),
      totalFiles: project.stats?.totalFiles || 0,
      totalFeatures: project.stats?.featureCount || features.length,
      techStack: projectFrameworks,
    },
    features: features.map((f) => ({
      featureName: f.name,
      shortSummary: f.aiDocumentation?.shortSummary || null,
    })),
  };

  logger.info(`[DocGen] Regenerating project overview: ${project.name}`);
  const doc = await generateProjectDoc(projectContext);

  const aiDoc = {
    detailedSummary: doc.detailedSummary,
    mermaidDiagram: doc.mermaidDiagram || null,
    searchTags: doc.searchTags || [],
  };

  await Project.updateOne({ _id: projectId }, { aiDocumentation: aiDoc });
  logger.info(`[DocGen] Project overview regenerated: ${project.name}`);
  return aiDoc;
}

/** Helper to emit progress + persist to DB */
async function _emitProgress(projectId, step, detail = null) {
  const payload = { step, detail };
  progressEmitter.emit(`progress:${projectId}`, payload);

  const update = { 'docProgress.step': step, 'docProgress.detail': detail };
  if (step !== 'error') {
    update.$addToSet = { 'docProgress.completedSteps': step };
  }

  // Use raw updateOne to allow both $set and $addToSet
  await Project.updateOne(
    { _id: projectId },
    {
      $set: { 'docProgress.step': step, 'docProgress.detail': detail },
      ...(step !== 'error' && step !== 'done'
        ? { $addToSet: { 'docProgress.completedSteps': step } }
        : {}),
    },
  ).catch(() => {});
}

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 2000;

/**
 * Orchestrate the full AI documentation + embedding pipeline for a project.
 * Steps: file docs → feature docs → project docs → RAG embeddings.
 * @param {string} projectId - MongoDB project ID.
 */
export async function generateDocumentation(projectId) {
  const startTime = Date.now();
  logger.info(
    `[DocGen] Starting documentation pipeline for project ${projectId}`,
  );

  // Load project metadata for context
  const project = await Project.findById(projectId).lean();
  if (!project) throw new Error(`Project ${projectId} not found`);

  const projectType = project.stats?.projectType || 'unknown';
  const projectFrameworks = project.stats?.frameworks || {};

  // ── Step 1: File-Level Docs ──
  await _emitProgress(projectId, 'file-docs', 'Starting file documentation...');
  await _generateFileDocs(projectId, projectType, projectFrameworks);

  // ── Step 2: Feature-Level Docs ──
  await _emitProgress(
    projectId,
    'feature-docs',
    'Starting feature documentation...',
  );
  await _generateFeatureDocs(projectId, projectType, projectFrameworks);

  // ── Step 3: Project-Level Docs ──
  await _emitProgress(
    projectId,
    'project-docs',
    'Generating project overview...',
  );
  await _generateProjectDocs(projectId, projectType, projectFrameworks);

  // ── Step 4: RAG Chunking & Embeddings ──
  await _emitProgress(projectId, 'embeddings', 'Building search embeddings...');
  logger.info('[DocGen] Step 4/4: Generating embeddings');
  await storeEmbeddings(projectId);

  await _emitProgress(projectId, 'done', 'Pipeline complete');

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  logger.info(
    `[DocGen] Pipeline complete for project ${projectId} in ${elapsed}s`,
  );
}

// ── Step 1: File-Level Documentation ──

async function _generateFileDocs(projectId, projectType, projectFrameworks) {
  const files = await File.find({ projectId }).lean();
  logger.info(
    `[DocGen] Step 1/4: Generating file docs for ${files.length} files`,
  );

  // Group by tier
  const tier1 = files.filter((f) => (f.analysis?.tier ?? 3) === 1);
  const tier2 = files.filter((f) => (f.analysis?.tier ?? 3) === 2);
  const tier3 = files.filter((f) => (f.analysis?.tier ?? 3) === 3);

  logger.info(
    `[DocGen] Tier 1: ${tier1.length}, Tier 2: ${tier2.length}, Tier 3: ${tier3.length}`,
  );

  const totalFiles = files.length;
  let completedFiles = 0;

  const onFileComplete = async (count) => {
    completedFiles += count;
    await _emitProgress(
      projectId,
      'file-docs',
      `${completedFiles}/${totalFiles} files documented`,
    );
  };

  // Process Tier 1 & 2 (full content)
  const highTierFiles = [...tier1, ...tier2];
  await _processFilesBatch(
    highTierFiles,
    projectType,
    projectFrameworks,
    /* fullContent */ true,
    onFileComplete,
  );

  // Process Tier 3 (metadata only)
  await _processFilesBatch(
    tier3,
    projectType,
    projectFrameworks,
    /* fullContent */ false,
    onFileComplete,
  );
}

async function _processFilesBatch(
  files,
  projectType,
  projectFrameworks,
  fullContent,
  onBatchComplete,
) {
  let completed = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (file) => {
        const tier = file.analysis?.tier ?? 3;
        const fileData = {
          path: file.path,
          type: file.analysis?.type || 'unknown',
          role: file.analysis?.role || 'Unknown',
          category: file.analysis?.category || 'infrastructure',
          behavior: file.analysis?.behavior || 'logic',
          routes: file.analysis?.routes || [],
          imports: file.analysis?.imports || {},
          importedBy: file.analysis?.importedBy || [],
          exports: file.analysis?.exports || [],
          projectType,
          projectFrameworks,
        };

        if (fullContent) {
          fileData.fileContent = file.content || '';
        }

        const doc = await generateFileDoc(fileData, tier);

        // Build update payload
        const update = { shortSummary: doc.shortSummary };
        if (fullContent) {
          update.detailedSummary = doc.detailedSummary || null;
          update.mermaidDiagram = doc.mermaidDiagram || null;
          update.searchTags = doc.searchTags || [];
        }

        await File.updateOne({ _id: file._id }, { aiDocumentation: update });
        return file.path;
      }),
    );

    let batchCompleted = 0;
    for (const r of results) {
      if (r.status === 'fulfilled') {
        completed++;
        batchCompleted++;
      } else {
        failed++;
        batchCompleted++;
        logger.error(`File doc failed: ${r.reason?.message}`);
      }
    }

    // Report batch progress
    if (onBatchComplete) await onBatchComplete(batchCompleted);

    // Delay between batches
    if (i + BATCH_SIZE < files.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  const label = fullContent ? 'Tier 1/2' : 'Tier 3';
  logger.info(`${label}: ${completed} done, ${failed} failed`);
}

// ── Step 2: Feature-Level Documentation ──

async function _generateFeatureDocs(projectId, projectType, projectFrameworks) {
  const features = await Feature.find({ projectId }).populate({
    path: 'fileIds',
    select:
      'path analysis.role analysis.category analysis.tier aiDocumentation.shortSummary',
  });

  logger.info(
    `[DocGen] Step 2/4: Generating feature docs for ${features.length} features`,
  );

  const totalFeatures = features.length;
  let completed = 0;
  let failed = 0;

  for (let i = 0; i < features.length; i += BATCH_SIZE) {
    const batch = features.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (feature) => {
        const featureContext = (feature.fileIds || []).map((f) => ({
          path: f.path,
          role: f.analysis?.role || 'Unknown',
          category: f.analysis?.category || 'infrastructure',
          tier: f.analysis?.tier ?? 3,
          shortSummary: f.aiDocumentation?.shortSummary || null,
        }));

        const doc = await generateFeatureDoc(
          feature.name,
          featureContext,
          projectType,
          projectFrameworks,
        );

        await Feature.updateOne(
          { _id: feature._id },
          {
            aiDocumentation: {
              shortSummary: doc.shortSummary,
              detailedSummary: doc.detailedSummary || null,
              mermaidDiagram: doc.mermaidDiagram || null,
              searchTags: doc.searchTags || [],
            },
          },
        );

        return feature.name;
      }),
    );

    for (const r of results) {
      if (r.status === 'fulfilled') {
        completed++;
      } else {
        failed++;
        logger.error(`Feature doc failed: ${r.reason?.message}`);
      }
    }

    await _emitProgress(
      projectId,
      'feature-docs',
      `${completed + failed}/${totalFeatures} features documented`,
    );

    if (i + BATCH_SIZE < features.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  logger.info(`Features: ${completed} done, ${failed} failed`);
}

// ── Step 3: Project-Level Documentation ──

async function _generateProjectDocs(projectId, projectType, projectFrameworks) {
  logger.info('[DocGen] Step 3/4: Generating project-level docs');

  const project = await Project.findById(projectId).lean();

  // Get entry points
  const entryPoints = await File.find(
    { projectId, 'analysis.type': 'entry-point' },
    { path: 1 },
  ).lean();

  // Get all feature summaries
  const features = await Feature.find(
    { projectId },
    { name: 1, 'aiDocumentation.shortSummary': 1 },
  ).lean();

  const projectContext = {
    metadata: {
      projectType,
      projectFrameworks,
      entryPoints: entryPoints.map((f) => f.path),
      totalFiles: project.stats?.totalFiles || 0,
      totalFeatures: project.stats?.featureCount || features.length,
      techStack: projectFrameworks,
    },
    features: features.map((f) => ({
      featureName: f.name,
      shortSummary: f.aiDocumentation?.shortSummary || null,
    })),
  };

  // Project-level failure is critical — let it throw
  const doc = await generateProjectDoc(projectContext);

  await Project.updateOne(
    { _id: projectId },
    {
      aiDocumentation: {
        detailedSummary: doc.detailedSummary,
        mermaidDiagram: doc.mermaidDiagram || null,
        searchTags: doc.searchTags || [],
      },
    },
  );

  logger.info('Project docs generated');
}
