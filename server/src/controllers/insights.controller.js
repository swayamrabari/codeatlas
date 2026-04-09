import File from '../models/File.js';
import Feature from '../models/Feature.js';
import { findAccessibleProject } from '../utils/projectAccess.js';

/**
 * Get full project with relationships and stats.
 * Does NOT include file contents.
 */
export async function getInsightsPageData(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, error: 'Project ID is required' });
    }

    const project = await findAccessibleProject(id, userId, {
      name: 1,
      'stats.totalFiles': 1,
      'stats.frameworks': 1,
      'stats.projectType': 1,
      'stats.relationshipStats': 1,
    }).lean();

    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: 'Project not found' });
    }

    const files = await File.find(
      { projectId: id },
      {
        path: 1,
        analysis: 1,
      },
    )
      .sort({ path: 1 })
      .lean();

    const features = await Feature.find(
      { projectId: id },
      {
        name: 1,
        keyword: 1,
        fileCount: 1,
        categorizedFiles: 1,
        sharedDependencies: 1,
        apiRoutes: 1,
      },
    ).lean();

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
      projectName: project.name || 'Unnamed Project',
      totalFiles: project.stats?.totalFiles || files.length,
      frameworks: project.stats?.frameworks || {},
      projectType: project.stats?.projectType || '',
      relationshipStats: project.stats?.relationshipStats || null,
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
