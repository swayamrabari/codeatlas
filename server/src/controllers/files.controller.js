import Project from '../models/Project.js';
import File from '../models/File.js';
import Feature from '../models/Feature.js';

async function ensureOwnedProject(projectId, userId) {
  return Project.findOne({ _id: projectId, userId }, { _id: 1 }).lean();
}

/**
 * Get file list for a project — light mode (no content, no detailed analysis).
 * Used for Explorer sidebar lazy loading.
 */
export async function getProjectFileList(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Verify project ownership
    const project = await ensureOwnedProject(id, userId);
    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: 'Project not found' });
    }

    const files = await File.find(
      { projectId: id },
      {
        path: 1,
        extension: 1,
        size: 1,
        lineCount: 1,
        'analysis.type': 1,
        'analysis.role': 1,
        'analysis.category': 1,
        'analysis.behavior': 1,
        'analysis.tier': 1,
        'aiDocumentation.shortSummary': 1,
      },
    ).sort({ path: 1 });

    return res.status(200).json({ success: true, data: files });
  } catch (error) {
    console.error('Error fetching file list:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch file list' });
  }
}

/**
 * Get file list optimized for Files page deterministic analysis view.
 */
export async function getFilesPageFileList(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const project = await ensureOwnedProject(id, userId);
    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: 'Project not found' });
    }

    const files = await File.find(
      { projectId: id },
      {
        path: 1,
        'analysis.type': 1,
        'analysis.role': 1,
        'analysis.category': 1,
        'analysis.behavior': 1,
        'analysis.tier': 1,
        'analysis.routes': 1,
        'analysis.mountPrefix': 1,
        'analysis.absoluteRoutes': 1,
        'analysis.imports': 1,
        'analysis.importedBy': 1,
        'analysis.exportsCount': 1,
        'analysis.exports': 1,
        'analysis.thirdPartyDeps': 1,
      },
    )
      .sort({ path: 1 })
      .lean();

    const data = files.map((f) => ({
      path: f.path,
      type: f.analysis?.type || 'unknown',
      role: f.analysis?.role || 'Unknown',
      category: f.analysis?.category || 'infrastructure',
      behavior: f.analysis?.behavior || 'logic',
      tier: f.analysis?.tier ?? 3,
      routes: f.analysis?.routes || [],
      mountPrefix: f.analysis?.mountPrefix,
      absoluteRoutes: f.analysis?.absoluteRoutes || [],
      imports: f.analysis?.imports || { count: 0, files: [], items: [] },
      importedBy: f.analysis?.importedBy || [],
      exportsCount: f.analysis?.exportsCount || 0,
      exports: f.analysis?.exports || [],
      thirdPartyDeps: f.analysis?.thirdPartyDeps || [],
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error fetching files page data:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch files page data' });
  }
}

/**
 * Get lightweight file list optimized for Source page explorer.
 */
export async function getSourceFileList(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const project = await ensureOwnedProject(id, userId);
    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: 'Project not found' });
    }

    const files = await File.find(
      { projectId: id },
      {
        path: 1,
        'analysis.type': 1,
        'aiDocumentation.shortSummary': 1,
      },
    )
      .sort({ path: 1 })
      .lean();

    const data = files.map((f) => ({
      path: f.path,
      type: f.analysis?.type || 'unknown',
      aiDocumentation: {
        shortSummary: f.aiDocumentation?.shortSummary || '',
      },
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error fetching source file list:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch source file list' });
  }
}

/**
 * Get a single file's full content + analysis + AI docs.
 * This is the lazy-load endpoint — called when a file is clicked in Explorer.
 */
export async function getSourceFileContent(req, res) {
  try {
    const { id } = req.params;
    const filePath = req.query.path;
    const userId = req.user._id;

    if (!id || !filePath) {
      return res.status(400).json({
        success: false,
        error: 'Project ID and file path are required',
      });
    }

    // Verify project ownership
    const project = await ensureOwnedProject(id, userId);
    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: 'Project not found' });
    }

    // Normalize path separators for cross-platform consistency
    const normalizedPath = filePath.replace(/\\/g, '/');
    const file = await File.findOne(
      { projectId: id, path: normalizedPath },
      {
        content: 1,
        path: 1,
        extension: 1,
        size: 1,
        lineCount: 1,
        'aiDocumentation.shortSummary': 1,
      },
    ).lean();

    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    return res.status(200).json({
      success: true,
      content: file.content || '',
      file: {
        path: file.path,
        extension: file.extension,
        size: file.size,
        lineCount: file.lineCount,
        aiDocumentation: {
          shortSummary: file.aiDocumentation?.shortSummary || '',
        },
      },
    });
  } catch (error) {
    console.error('Error reading file content:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to read file content' });
  }
}

/**
 * Get features for a project.
 */
export async function getFilesPageFeatures(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Verify project ownership
    const project = await ensureOwnedProject(id, userId);
    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: 'Project not found' });
    }

    const features = await Feature.find({ projectId: id }).lean();

    return res.status(200).json({ success: true, data: features });
  } catch (error) {
    console.error('Error fetching features:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch features' });
  }
}

/**
 * Get a single feature with populated file references.
 */
export async function getFilesPageFeatureDetail(req, res) {
  try {
    const { id, keyword } = req.params;
    const userId = req.user._id;

    // Verify project ownership
    const project = await ensureOwnedProject(id, userId);
    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: 'Project not found' });
    }

    const feature = await Feature.findOne({
      projectId: id,
      keyword: keyword.toLowerCase(),
    })
      .populate({
        path: 'fileIds',
        select:
          'path extension analysis.type analysis.role aiDocumentation.shortSummary',
      })
      .lean();

    if (!feature) {
      return res
        .status(404)
        .json({ success: false, error: 'Feature not found' });
    }

    return res.status(200).json({ success: true, data: feature });
  } catch (error) {
    console.error('Error fetching feature:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch feature' });
  }
}
