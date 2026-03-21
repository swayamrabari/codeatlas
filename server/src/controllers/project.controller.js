import Project from '../models/Project.js';
import File from '../models/File.js';
import Feature from '../models/Feature.js';
import Embedding from '../models/Embedding.js';
import Chat from '../models/Chat.js';

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
    const filesFormatted = files.map((f) => {
      const result = {
        path: f.path,
        type: f.analysis?.type || 'unknown',
        role: f.analysis?.role || 'Unknown',
        category: f.analysis?.category || 'infrastructure',
        behavior: f.analysis?.behavior || 'logic',
        tier: f.analysis?.tier ?? 3,
        routes: f.analysis?.routes || [],
        imports: f.analysis?.imports || { count: 0, files: [], items: [] },
        importedBy: f.analysis?.importedBy || [],
        exportsCount: f.analysis?.exportsCount || 0,
        exports: f.analysis?.exports || [],
        thirdPartyDeps: f.analysis?.thirdPartyDeps || [],
        exportedSymbols: f.analysis?.exportedSymbols || [],
      };

      if (f.analysis?.mountPrefix !== undefined) {
        result.mountPrefix = f.analysis.mountPrefix;
      }
      if (f.analysis?.absoluteRoutes) {
        result.absoluteRoutes = f.analysis.absoluteRoutes;
      }

      return result;
    });

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
 * Lightweight status endpoint for polling during documentation generation.
 */
export async function getProjectStatus(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const project = await Project.findOne(
      { _id: id, userId },
      {
        status: 1,
        name: 1,
        'stats.totalFiles': 1,
        'stats.featureCount': 1,
        docProgress: 1,
      },
    );

    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: 'Project not found' });
    }

    return res.status(200).json({
      success: true,
      data: {
        status: project.status,
        name: project.name,
        totalFiles: project.stats?.totalFiles || 0,
        featureCount: project.stats?.featureCount || 0,
        docProgress: project.docProgress || null,
      },
    });
  } catch (error) {
    console.error('Error fetching project status:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch project status' });
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
      Embedding.deleteMany({ projectId: id }),
      Chat.deleteMany({ projectId: id }),
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
