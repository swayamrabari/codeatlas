import Project from '../models/Project.js';
import File from '../models/File.js';
import Feature from '../models/Feature.js';

/**
 * List all projects for the authenticated user.
 * Returns lightweight project metadata only — no files, no relationships.
 */
export async function listProjects(req, res) {
  try {
    const userId = req.user._id;

    const projects = await Project.find(
      { userId },
      {
        name: 1,
        description: 1,
        status: 1,
        uploadType: 1,
        'stats.totalFiles': 1,
        'stats.projectType': 1,
        'stats.frameworks': 1,
        'stats.featureCount': 1,
        createdAt: 1,
        updatedAt: 1,
      },
    ).sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: projects });
  } catch (error) {
    console.error('Error listing projects:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to list projects' });
  }
}

/**
 * Get full project with relationships and stats.
 * Does NOT include file contents — use getFileList or getFile for those.
 */
export async function getProject(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, error: 'Project ID is required' });
    }

    const project = await Project.findOne({ _id: id, userId });

    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: 'Project not found' });
    }

    // Fetch lightweight file list (no content)
    const files = await File.find(
      { projectId: id },
      {
        path: 1,
        extension: 1,
        size: 1,
        lineCount: 1,
        analysis: 1,
        'aiDocumentation.shortSummary': 1,
      },
    ).sort({ path: 1 });

    // Fetch features (lightweight)
    const features = await Feature.find(
      { projectId: id },
      {
        name: 1,
        keyword: 1,
        fileCount: 1,
        categorizedFiles: 1,
        sharedDependencies: 1,
        apiRoutes: 1,
        'aiDocumentation.shortSummary': 1,
      },
    );

    // Build the response in the same shape the frontend expects (demoOutput.json compat)
    const filesFormatted = files.map((f) => ({
      path: f.path,
      type: f.analysis?.type || 'unknown',
      role: f.analysis?.role || 'Unknown',
      category: f.analysis?.category || 'infrastructure',
      behavior: f.analysis?.behavior || 'logic',
      routes: f.analysis?.routes || [],
      imports: f.analysis?.imports || { count: 0, files: [], items: [] },
      importedBy: f.analysis?.importedBy || [],
      exportsCount: f.analysis?.exportsCount || 0,
      exports: f.analysis?.exports || [],
    }));

    // Build features object keyed by keyword (matching demoOutput.json shape)
    const featuresObj = {};
    for (const feat of features) {
      featuresObj[feat.keyword] = {
        name: feat.name,
        fileCount: feat.fileCount,
        allFiles: feat.categorizedFiles
          ? [
              ...(feat.categorizedFiles.frontend || []),
              ...(feat.categorizedFiles.backend || []),
              ...(feat.categorizedFiles.shared || []),
            ]
          : [],
        categorized: feat.categorizedFiles || {},
        sharedDependencies: feat.sharedDependencies || [],
        apiRoutes: feat.apiRoutes || [],
      };
    }

    const data = {
      totalFiles: project.stats?.totalFiles || files.length,
      frameworks: project.stats?.frameworks || {},
      projectType: project.stats?.projectType || '',
      relationshipStats: project.stats?.relationshipStats || null,
      relationships: project.relationships || [],
      features: featuresObj,
      files: filesFormatted,
    };

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error(`Error fetching project ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch project data',
      message: error.message,
    });
  }
}

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

/**
 * Delete a project and all associated data.
 */
export async function deleteProject(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const project = await Project.findOne({ _id: id, userId });
    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: 'Project not found' });
    }

    // Delete all associated data
    await Promise.all([
      File.deleteMany({ projectId: id }),
      Feature.deleteMany({ projectId: id }),
      Project.findByIdAndDelete(id),
    ]);

    return res.status(200).json({ success: true, message: 'Project deleted' });
  } catch (error) {
    console.error('Error deleting project:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to delete project' });
  }
}
