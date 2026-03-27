import Project from '../models/Project.js';
import File from '../models/File.js';
import Feature from '../models/Feature.js';

const PUBLIC_PROJECT_ID =
  process.env.PUBLIC_PROJECT_ID || '69a7ead0e60d8f73871a5801';

function isAllowedPublicProject(projectId) {
  return String(projectId) === String(PUBLIC_PROJECT_ID);
}

async function findPublicProjectById(projectId, projection = {}) {
  if (!isAllowedPublicProject(projectId)) return null;
  return Project.findById(projectId, projection);
}

/**
 * Public status endpoint for a single showcase project.
 */
export async function getPublicProjectStatus(req, res) {
  try {
    const { id } = req.params;

    const project = await findPublicProjectById(id, {
      status: 1,
      name: 1,
      'stats.totalFiles': 1,
      'stats.featureCount': 1,
      docProgress: 1,
    });

    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: 'Public project not found' });
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
    console.error('Error fetching public project status:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch public project status' });
  }
}

/**
 * Public project overview docs endpoint.
 */
export async function getPublicOverviewPageData(req, res) {
  try {
    const { id } = req.params;

    const project = await findPublicProjectById(id, {
      name: 1,
      aiDocumentation: 1,
      'stats.projectType': 1,
      'stats.frameworks': 1,
      'stats.totalFiles': 1,
      'stats.featureCount': 1,
    });

    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: 'Public project not found' });
    }

    const features = await Feature.find(
      { projectId: id },
      {
        name: 1,
        keyword: 1,
        fileCount: 1,
        fileIds: 1,
        aiDocumentation: 1,
      },
    )
      .populate({
        path: 'fileIds',
        select:
          'path analysis.role analysis.category analysis.tier aiDocumentation',
      })
      .lean();

    const featuresData = features.map((feat) => ({
      name: feat.name,
      keyword: feat.keyword,
      fileCount: feat.fileCount,
      aiDocumentation: feat.aiDocumentation || {},
      files: (feat.fileIds || []).map((f) => ({
        path: f.path,
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
    console.error('Error fetching public overview docs:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch public documentation' });
  }
}

/**
 * Public insights endpoint.
 */
export async function getPublicInsightsPageData(req, res) {
  try {
    const { id } = req.params;

    const project = await findPublicProjectById(id, {
      name: 1,
      'stats.totalFiles': 1,
      'stats.frameworks': 1,
      'stats.projectType': 1,
      'stats.relationshipStats': 1,
    });

    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: 'Public project not found' });
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
      projectName: project.name || 'Public Project',
      totalFiles: project.stats?.totalFiles || files.length,
      frameworks: project.stats?.frameworks || {},
      projectType: project.stats?.projectType || '',
      relationshipStats: project.stats?.relationshipStats || null,
      features: featuresObj,
      files: filesFormatted,
    };

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error fetching public insights data:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch public project data' });
  }
}

/**
 * Public files page endpoint.
 */
export async function getPublicFilesPageFileList(req, res) {
  try {
    const { id } = req.params;

    const project = await findPublicProjectById(id, { _id: 1 });
    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: 'Public project not found' });
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
    console.error('Error fetching public files page data:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch public files page data',
    });
  }
}

/**
 * Public source file list endpoint.
 */
export async function getPublicSourceFileList(req, res) {
  try {
    const { id } = req.params;

    const project = await findPublicProjectById(id, { _id: 1 });
    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: 'Public project not found' });
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
    console.error('Error fetching public source file list:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch public source file list',
    });
  }
}

/**
 * Public source file content endpoint.
 */
export async function getPublicSourceFileContent(req, res) {
  try {
    const { id } = req.params;
    const filePath = req.query.path;

    if (!id || !filePath) {
      return res.status(400).json({
        success: false,
        error: 'Project ID and file path are required',
      });
    }

    const project = await findPublicProjectById(id, { _id: 1 });
    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: 'Public project not found' });
    }

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
      return res
        .status(404)
        .json({ success: false, error: 'File not found in public project' });
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
    console.error('Error reading public source file content:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to read public file content' });
  }
}
