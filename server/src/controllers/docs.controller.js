import Project from '../models/Project.js';
import File from '../models/File.js';
import Feature from '../models/Feature.js';
import progressEmitter from '../analysis/progressEmitter.js';
import {
  regenerateSingleFileDoc,
  regenerateSingleFeatureDoc,
  regenerateProjectOverviewDoc,
} from '../analysis/docGenerator.js';

/**
 * Get full AI documentation for a project — project overview, features with docs, files grouped by feature.
 */
export async function getProjectDocs(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const project = await Project.findOne(
      { _id: id, userId },
      {
        name: 1,
        status: 1,
        aiDocumentation: 1,
        'stats.projectType': 1,
        'stats.frameworks': 1,
        'stats.totalFiles': 1,
        'stats.featureCount': 1,
      },
    );

    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: 'Project not found' });
    }

    // Fetch features with full AI docs + populated file references
    const features = await Feature.find(
      { projectId: id },
      {
        name: 1,
        keyword: 1,
        fileCount: 1,
        fileIds: 1,
        aiDocumentation: 1,
      },
    ).populate({
      path: 'fileIds',
      select:
        'path extension analysis.type analysis.role analysis.category analysis.tier aiDocumentation',
    });

    // Build response
    const featuresData = features.map((feat) => ({
      name: feat.name,
      keyword: feat.keyword,
      fileCount: feat.fileCount,
      aiDocumentation: feat.aiDocumentation || {},
      files: (feat.fileIds || []).map((f) => ({
        path: f.path,
        extension: f.extension,
        type: f.analysis?.type || 'unknown',
        role: f.analysis?.role || 'Unknown',
        category: f.analysis?.category || 'infrastructure',
        tier: f.analysis?.tier ?? 3,
        aiDocumentation: f.aiDocumentation || {},
      })),
    }));

    return res.status(200).json({
      success: true,
      data: {
        project: {
          name: project.name,
          status: project.status,
          projectType: project.stats?.projectType || '',
          frameworks: project.stats?.frameworks || {},
          totalFiles: project.stats?.totalFiles || 0,
          featureCount: project.stats?.featureCount || 0,
          aiDocumentation: project.aiDocumentation || {},
        },
        features: featuresData,
      },
    });
  } catch (error) {
    console.error('Error fetching project docs:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch documentation' });
  }
}

/**
 * SSE endpoint — streams real-time documentation pipeline progress.
 * GET /api/project/:id/progress?token=JWT
 */
export async function streamProgress(req, res) {
  const { id } = req.params;
  const userId = req.user._id;

  // Verify the user owns this project
  const project = await Project.findOne(
    { _id: id, userId },
    { status: 1, docProgress: 1, name: 1 },
  );

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Send current state immediately
  const initialData = {
    step: project.docProgress?.step || null,
    detail: project.docProgress?.detail || null,
    status: project.status,
  };
  res.write(`data: ${JSON.stringify(initialData)}\n\n`);

  // If already done, close immediately
  if (
    project.status === 'ready' &&
    (!project.docProgress?.step ||
      project.docProgress.step === 'done' ||
      project.docProgress.step === 'error')
  ) {
    res.write(
      `data: ${JSON.stringify({ step: 'done', detail: 'Already complete', status: 'ready' })}\n\n`,
    );
    return res.end();
  }

  // Listen for progress events
  const eventKey = `progress:${id}`;
  const handler = (data) => {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      if (data.step === 'done' || data.step === 'error') {
        // Give time for the last event to flush, then close
        setTimeout(() => {
          progressEmitter.removeListener(eventKey, handler);
          res.end();
        }, 500);
      }
    } catch {
      progressEmitter.removeListener(eventKey, handler);
    }
  };

  progressEmitter.on(eventKey, handler);

  // Cleanup on client disconnect
  req.on('close', () => {
    progressEmitter.removeListener(eventKey, handler);
  });

  // Safety timeout — close after 10 minutes max
  const timeout = setTimeout(
    () => {
      progressEmitter.removeListener(eventKey, handler);
      try {
        res.write(
          `data: ${JSON.stringify({ step: 'done', detail: 'Timeout' })}\n\n`,
        );
        res.end();
      } catch {}
    },
    10 * 60 * 1000,
  );

  req.on('close', () => clearTimeout(timeout));
}

// ─────────────────────────────────────────────
// ── Selective Doc Regeneration Endpoints    ──
// ─────────────────────────────────────────────

/**
 * Regenerate documentation for a single file.
 * POST /project/:id/regenerate/file  body: { filePath }
 */
export async function regenerateFileDocs(req, res) {
  try {
    const { id } = req.params;
    const { filePath } = req.body;
    const userId = req.user._id;

    if (!filePath) {
      return res
        .status(400)
        .json({ success: false, error: 'filePath is required' });
    }

    // Verify project ownership
    const project = await Project.findOne({ _id: id, userId }, { _id: 1 });
    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: 'Project not found' });
    }

    // Find the file
    const file = await File.findOne(
      { projectId: id, path: filePath },
      { _id: 1 },
    );
    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    const aiDocumentation = await regenerateSingleFileDoc(file._id);
    return res.status(200).json({ success: true, data: { aiDocumentation } });
  } catch (error) {
    console.error('Error regenerating file doc:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to regenerate file documentation',
    });
  }
}

/**
 * Regenerate documentation for a single feature.
 * POST /project/:id/regenerate/feature  body: { keyword }
 */
export async function regenerateFeatureDocs(req, res) {
  try {
    const { id } = req.params;
    const { keyword } = req.body;
    const userId = req.user._id;

    if (!keyword) {
      return res
        .status(400)
        .json({ success: false, error: 'keyword is required' });
    }

    const project = await Project.findOne({ _id: id, userId }, { _id: 1 });
    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: 'Project not found' });
    }

    const feature = await Feature.findOne(
      { projectId: id, keyword },
      { _id: 1 },
    );
    if (!feature) {
      return res
        .status(404)
        .json({ success: false, error: 'Feature not found' });
    }

    const aiDocumentation = await regenerateSingleFeatureDoc(feature._id);
    return res.status(200).json({ success: true, data: { aiDocumentation } });
  } catch (error) {
    console.error('Error regenerating feature doc:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to regenerate feature documentation',
    });
  }
}

/**
 * Regenerate project overview documentation only.
 * POST /project/:id/regenerate/project
 */
export async function regenerateProjectDocs(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const project = await Project.findOne({ _id: id, userId }, { _id: 1 });
    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: 'Project not found' });
    }

    const aiDocumentation = await regenerateProjectOverviewDoc(id);
    return res.status(200).json({ success: true, data: { aiDocumentation } });
  } catch (error) {
    console.error('Error regenerating project doc:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to regenerate project documentation',
    });
  }
}
