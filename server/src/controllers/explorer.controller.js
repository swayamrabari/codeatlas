import Project from '../models/Project.js';
import File from '../models/File.js';
import Feature from '../models/Feature.js';

/**
 * Get file list for a project — light mode (no content, no detailed analysis).
 * Used for Explorer sidebar lazy loading.
 */
export async function getFileList(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Verify project ownership
    const project = await Project.findOne({ _id: id, userId }, { _id: 1 });
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
 * Get a single file's full content + analysis + AI docs.
 * This is the lazy-load endpoint — called when a file is clicked in Explorer.
 */
export async function getFileContent(req, res) {
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
    const project = await Project.findOne({ _id: id, userId }, { _id: 1 });
    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: 'Project not found' });
    }

    // Normalize path separators for cross-platform consistency
    const normalizedPath = filePath.replace(/\\/g, '/');
    const file = await File.findOne({ projectId: id, path: normalizedPath });

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
        analysis: file.analysis,
        aiDocumentation: file.aiDocumentation,
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
export async function getFeatures(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Verify project ownership
    const project = await Project.findOne({ _id: id, userId }, { _id: 1 });
    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: 'Project not found' });
    }

    const features = await Feature.find({ projectId: id });

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
export async function getFeatureDetail(req, res) {
  try {
    const { id, keyword } = req.params;
    const userId = req.user._id;

    // Verify project ownership
    const project = await Project.findOne({ _id: id, userId }, { _id: 1 });
    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: 'Project not found' });
    }

    const feature = await Feature.findOne({
      projectId: id,
      keyword: keyword.toLowerCase(),
    }).populate({
      path: 'fileIds',
      select:
        'path extension analysis.type analysis.role aiDocumentation.shortSummary',
    });

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
