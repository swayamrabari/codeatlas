import Project from '../models/Project.js';
import File from '../models/File.js';
import Feature from '../models/Feature.js';
import Embedding from '../models/Embedding.js';
import Chat from '../models/Chat.js';
import User from '../models/User.js';
import {
  findAccessibleProject,
  isProjectOwner,
} from '../utils/projectAccess.js';

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

function escapeRegex(input) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toUserSummary(user) {
  if (!user) return null;
  return {
    _id: String(user._id),
    name: user.name,
    email: user.email,
  };
}

/**
 * List all projects for the authenticated user.
 * Returns lightweight project metadata only — no files, no relationships.
 */
export async function listProjects(req, res) {
  try {
    const userId = req.user._id;

    const projects = await Project.find(
      {
        $or: [{ userId }, { 'sharedWith.userId': userId }],
      },
      {
        userId: 1,
        sharedWith: 1,
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
    )
      .populate({
        path: 'userId',
        select: 'name email',
      })
      .sort({ createdAt: -1 })
      .lean();

    const data = projects.map((project) => {
      const owner = toUserSummary(project.userId);
      const ownerId = String(owner?._id || project.userId || '');
      const currentUserId = String(userId);
      const accessType = ownerId === currentUserId ? 'owner' : 'shared';

      return {
        _id: String(project._id),
        name: project.name,
        description: project.description,
        status: project.status,
        uploadType: project.uploadType,
        stats: project.stats || {},
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        accessType,
        proprietor: owner,
        sharedCount: Array.isArray(project.sharedWith)
          ? project.sharedWith.length
          : 0,
      };
    });

    return res.status(200).json({ success: true, data });
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

    const project = await findAccessibleProject(id, userId, {
      userId: 1,
      status: 1,
      name: 1,
      'stats.totalFiles': 1,
      'stats.featureCount': 1,
      docProgress: 1,
    });

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
        accessType: isProjectOwner(project, userId) ? 'owner' : 'shared',
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
 * ⭐ NEW: Cancel/Abort an in-progress upload
 * Deletes the project and all associated data
 */
export async function cancelProjectUpload(req, res) {
  try {
    const { id: projectId } = req.params;
    const userId = req.user._id;

    // Find the project
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    // Verify ownership
    if (project.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Only allow cancelling projects that are still processing
    if (
      !['uploading', 'scanning', 'analyzing', 'documenting'].includes(
        project.status,
      )
    ) {
      return res.status(400).json({
        success: false,
        error: 'Project is not in a cancellable state',
      });
    }

    // Delete associated data
    await File.deleteMany({ projectId });
    await Feature.deleteMany({ projectId });
    await Embedding.deleteMany({ projectId });
    await Chat.deleteMany({ projectId });

    // Delete project document
    await Project.findByIdAndDelete(projectId);

    logger.info(`Project ${projectId} cancelled by user ${userId}`);

    return res.status(200).json({
      success: true,
      message: 'Project upload cancelled successfully',
    });
  } catch (err) {
    logger.error('Cancel project error', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to cancel project',
      message: err.message,
    });
  }
}

/**
 * Delete a project and all associated data.
 */
export async function deleteProject(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const project = await findAccessibleProject(id, userId, {
      _id: 1,
      userId: 1,
    });
    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: 'Project not found' });
    }

    if (!isProjectOwner(project, userId)) {
      return res.status(403).json({
        success: false,
        error: 'Only the project proprietor can delete this project',
      });
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

/**
 * Suggest existing user emails for project sharing.
 */
export async function getShareSuggestions(req, res) {
  try {
    const userId = req.user._id;
    const q = normalizeEmail(req.query?.q);

    const emailFilter = q
      ? {
          email: { $regex: escapeRegex(q), $options: 'i' },
        }
      : {};

    const users = await User.find(
      {
        _id: { $ne: userId },
        isAdmin: { $ne: true },
        isBlocked: { $ne: true },
        isVerified: true,
        ...emailFilter,
      },
      {
        name: 1,
        email: 1,
      },
    )
      .sort({ email: 1 })
      .limit(20)
      .lean();

    return res.status(200).json({
      success: true,
      data: users.map((u) => ({
        _id: String(u._id),
        name: u.name,
        email: u.email,
      })),
    });
  } catch (error) {
    console.error('Error fetching share suggestions:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch user suggestions' });
  }
}

/**
 * Get project share settings (owner only).
 */
export async function getProjectShareSettings(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const project = await Project.findOne(
      { _id: id, userId },
      {
        _id: 1,
        name: 1,
        sharedWith: 1,
      },
    ).lean();

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or you are not the proprietor',
      });
    }

    const sharedWith = (project.sharedWith || []).map((entry) => ({
      _id: String(entry.userId),
      email: entry.email,
      sharedAt: entry.sharedAt || null,
    }));

    return res.status(200).json({
      success: true,
      data: {
        projectId: String(project._id),
        projectName: project.name,
        sharedWith,
      },
    });
  } catch (error) {
    console.error('Error fetching project share settings:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch project share settings',
    });
  }
}

/**
 * Update project shares (owner only).
 */
export async function updateProjectShares(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { emails } = req.body || {};

    if (!Array.isArray(emails)) {
      return res
        .status(400)
        .json({ success: false, error: 'emails must be an array' });
    }

    const normalizedEmails = [
      ...new Set(emails.map(normalizeEmail).filter(Boolean)),
    ];

    if (normalizedEmails.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'A project can be shared with at most 50 users',
      });
    }

    const project = await Project.findOne({ _id: id, userId }, { _id: 1 });
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or you are not the proprietor',
      });
    }

    if (normalizedEmails.length === 0) {
      await Project.updateOne({ _id: id }, { $set: { sharedWith: [] } });
      return res.status(200).json({
        success: true,
        message: 'Project sharing updated',
        data: { sharedWith: [] },
      });
    }

    const shareUsers = await User.find(
      {
        email: { $in: normalizedEmails },
        isAdmin: { $ne: true },
        isBlocked: { $ne: true },
        isVerified: true,
      },
      {
        _id: 1,
        email: 1,
      },
    ).lean();

    const validEmailSet = new Set(
      shareUsers.map((u) => normalizeEmail(u.email)),
    );
    const missingEmails = normalizedEmails.filter(
      (email) => !validEmailSet.has(email),
    );

    if (missingEmails.length > 0) {
      return res.status(400).json({
        success: false,
        error:
          'Some emails are invalid or unavailable for sharing. Please use suggested users only.',
        details: {
          invalidEmails: missingEmails,
        },
      });
    }

    const ownerId = String(userId);
    const sharedWith = shareUsers
      .filter((u) => String(u._id) !== ownerId)
      .map((u) => ({
        userId: u._id,
        email: normalizeEmail(u.email),
        sharedAt: new Date(),
      }));

    await Project.updateOne({ _id: id }, { $set: { sharedWith } });

    return res.status(200).json({
      success: true,
      message: 'Project sharing updated',
      data: {
        sharedWith: sharedWith.map((entry) => ({
          _id: String(entry.userId),
          email: entry.email,
          sharedAt: entry.sharedAt,
        })),
      },
    });
  } catch (error) {
    console.error('Error updating project shares:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to update project sharing' });
  }
}
