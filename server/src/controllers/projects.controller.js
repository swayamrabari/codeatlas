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
