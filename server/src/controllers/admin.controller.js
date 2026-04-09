import User from '../models/User.js';
import Project from '../models/Project.js';
import File from '../models/File.js';
import Embedding from '../models/Embedding.js';
import Chat from '../models/Chat.js';
import Feature from '../models/Feature.js';
import { sendAdminNoticeEmail } from '../services/email.service.js';

function normalizeType(rawType) {
  if (!rawType || typeof rawType !== 'string') return 'unknown';
  const cleaned = rawType.trim().toLowerCase().replace(/^\.+/, '');
  return cleaned || 'unknown';
}

function normalizeAggregationRows(rows, keyName = 'type') {
  return rows.map((row) => ({
    [keyName]: normalizeType(row._id),
    count: row.count || 0,
  }));
}

function toIdMap(rows, valueKey = 'count') {
  const map = new Map();
  for (const row of rows || []) {
    if (!row?._id) continue;
    map.set(String(row._id), row[valueKey] || 0);
  }
  return map;
}

function toUserSummary(user, counters = {}) {
  const userId = String(user._id);
  return {
    _id: userId,
    name: user.name,
    email: user.email,
    isVerified: !!user.isVerified,
    isAdmin: !!user.isAdmin,
    isBlocked: !!user.isBlocked,
    blockedAt: user.blockedAt || null,
    blockReason: user.blockReason || null,
    lastAdminNotificationAt: user.lastAdminNotificationAt || null,
    adminNotificationCount: user.adminNotificationCount || 0,
    projectsCount: counters.projectsCountMap?.get(userId) || 0,
    filesCount: counters.filesCountMap?.get(userId) || 0,
    chatsCount: counters.chatsCountMap?.get(userId) || 0,
    chatRequestsCount: counters.chatRequestsCountMap?.get(userId) || 0,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * GET /api/admin/stats
 * Returns global app usage stats for admin dashboard.
 */
export async function getAdminStats(req, res) {
  try {
    const [
      totalUsers,
      verifiedUsers,
      adminUsers,
      blockedUsers,
      totalProjects,
      readyProjects,
      failedProjects,
      totalFiles,
      totalEmbeddings,
      totalFeatures,
      projectStatusBreakdown,
      chatStatsRows,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isVerified: true }),
      User.countDocuments({ isAdmin: true }),
      User.countDocuments({ isBlocked: true }),
      Project.countDocuments(),
      Project.countDocuments({ status: 'ready' }),
      Project.countDocuments({ status: 'failed' }),
      File.countDocuments(),
      Embedding.countDocuments(),
      Feature.countDocuments(),
      Project.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
      Chat.aggregate([
        {
          $project: {
            messageCount: { $ifNull: ['$messageCount', 0] },
            userMessages: {
              $size: {
                $filter: {
                  input: '$messages',
                  as: 'msg',
                  cond: { $eq: ['$$msg.role', 'user'] },
                },
              },
            },
            assistantMessages: {
              $size: {
                $filter: {
                  input: '$messages',
                  as: 'msg',
                  cond: { $eq: ['$$msg.role', 'assistant'] },
                },
              },
            },
          },
        },
        {
          $group: {
            _id: null,
            totalChats: { $sum: 1 },
            totalMessages: { $sum: '$messageCount' },
            totalUserMessages: { $sum: '$userMessages' },
            totalAssistantMessages: { $sum: '$assistantMessages' },
          },
        },
      ]),
    ]);

    const chatStats = chatStatsRows[0] || {
      totalChats: 0,
      totalMessages: 0,
      totalUserMessages: 0,
      totalAssistantMessages: 0,
    };

    return res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers,
          verifiedUsers,
          adminUsers,
          blockedUsers,
          activeUsers: Math.max(totalUsers - blockedUsers, 0),
          totalProjects,
          readyProjects,
          failedProjects,
          totalFiles,
          totalEmbeddings,
          totalFeatures,
          totalChatRequests: chatStats.totalUserMessages,
          totalChats: chatStats.totalChats,
        },
        chats: {
          totalChats: chatStats.totalChats,
          totalMessages: chatStats.totalMessages,
          totalUserMessages: chatStats.totalUserMessages,
          totalAssistantMessages: chatStats.totalAssistantMessages,
          avgMessagesPerChat:
            chatStats.totalChats > 0
              ? Number(
                  (chatStats.totalMessages / chatStats.totalChats).toFixed(2),
                )
              : 0,
        },
        projectStatusBreakdown: normalizeAggregationRows(
          projectStatusBreakdown,
          'status',
        ),
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch admin stats' });
  }
}

/**
 * GET /api/admin/users
 * Returns non-admin users with app usage counters.
 */
export async function listAdminUsers(req, res) {
  try {
    const [users, projectCounts, fileCounts, chatStats] = await Promise.all([
      User.find(
        { isAdmin: { $ne: true } },
        {
          name: 1,
          email: 1,
          isVerified: 1,
          isAdmin: 1,
          isBlocked: 1,
          blockedAt: 1,
          blockReason: 1,
          lastAdminNotificationAt: 1,
          adminNotificationCount: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      )
        .sort({ createdAt: -1 })
        .lean(),
      Project.aggregate([
        {
          $group: {
            _id: '$userId',
            count: { $sum: 1 },
          },
        },
      ]),
      File.aggregate([
        {
          $group: {
            _id: '$userId',
            count: { $sum: 1 },
          },
        },
      ]),
      Chat.aggregate([
        {
          $project: {
            userId: 1,
            userMessages: {
              $size: {
                $filter: {
                  input: '$messages',
                  as: 'msg',
                  cond: { $eq: ['$$msg.role', 'user'] },
                },
              },
            },
          },
        },
        {
          $group: {
            _id: '$userId',
            chatsCount: { $sum: 1 },
            chatRequestsCount: { $sum: '$userMessages' },
          },
        },
      ]),
    ]);

    const projectsCountMap = toIdMap(projectCounts, 'count');
    const filesCountMap = toIdMap(fileCounts, 'count');
    const chatsCountMap = new Map();
    const chatRequestsCountMap = new Map();

    for (const row of chatStats) {
      if (!row?._id) continue;
      const key = String(row._id);
      chatsCountMap.set(key, row.chatsCount || 0);
      chatRequestsCountMap.set(key, row.chatRequestsCount || 0);
    }

    const data = users.map((user) =>
      toUserSummary(user, {
        projectsCountMap,
        filesCountMap,
        chatsCountMap,
        chatRequestsCountMap,
      }),
    );

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error listing admin users:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to list users' });
  }
}

/**
 * POST /api/admin/users/:id/notify
 * Sends an admin notification email to the selected user.
 */
export async function notifyAdminUser(req, res) {
  try {
    const { id } = req.params;
    const subject = String(req.body?.subject || '').trim();
    const message = String(req.body?.message || '').trim();

    if (!subject) {
      return res
        .status(400)
        .json({ success: false, error: 'Notification subject is required' });
    }

    if (!message) {
      return res
        .status(400)
        .json({ success: false, error: 'Notification message is required' });
    }

    if (subject.length > 200) {
      return res.status(400).json({
        success: false,
        error: 'Notification subject must be at most 200 characters',
      });
    }

    if (message.length > 5000) {
      return res.status(400).json({
        success: false,
        error: 'Notification message must be at most 5000 characters',
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    await sendAdminNoticeEmail(user.email, user.name, subject, message);

    user.lastAdminNotificationAt = new Date();
    user.adminNotificationCount = (user.adminNotificationCount || 0) + 1;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Notification sent successfully',
      data: toUserSummary(user),
    });
  } catch (error) {
    console.error('Error notifying user:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to send notification' });
  }
}

/**
 * PATCH /api/admin/users/:id/block
 * Blocks or unblocks a user account.
 */
export async function setUserBlockedStatus(req, res) {
  try {
    const { id } = req.params;
    const { blocked, reason } = req.body || {};

    if (typeof blocked !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'blocked must be a boolean value',
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.isAdmin && blocked) {
      return res.status(400).json({
        success: false,
        error: 'Admin users cannot be blocked',
      });
    }

    if (blocked) {
      const cleanedReason = String(reason || '').trim();
      user.isBlocked = true;
      user.blockedAt = new Date();
      user.blockReason = cleanedReason || 'Blocked by administrator';
    } else {
      user.isBlocked = false;
      user.blockedAt = null;
      user.blockReason = null;
    }

    await user.save();

    let notificationSent = false;
    let notificationError = null;

    const noticeSubject = blocked
      ? 'Your CodeAtlas account has been blocked'
      : 'Your CodeAtlas account access has been restored';
    const noticeMessage = blocked
      ? `Your CodeAtlas account has been blocked by an administrator.\n\nReason: ${user.blockReason || 'Not provided'}\n\nIf you believe this is a mistake, please contact support.`
      : 'Your CodeAtlas account has been unblocked by an administrator. You can now sign in again.';

    try {
      await sendAdminNoticeEmail(
        user.email,
        user.name,
        noticeSubject,
        noticeMessage,
      );
      notificationSent = true;
      user.lastAdminNotificationAt = new Date();
      user.adminNotificationCount = (user.adminNotificationCount || 0) + 1;
      await user.save();
    } catch (error) {
      notificationError = error?.message || 'Failed to send notification email';
      console.error('Failed to send block/unblock notice email:', error);
    }

    return res.status(200).json({
      success: true,
      message: blocked
        ? 'User blocked successfully'
        : 'User unblocked successfully',
      notificationSent,
      notificationError,
      data: toUserSummary(user),
    });
  } catch (error) {
    console.error('Error updating user block status:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to update user status' });
  }
}

/**
 * DELETE /api/admin/users/:id
 * Permanently removes a user and all associated app data.
 */
export async function removeAdminUser(req, res) {
  try {
    const { id } = req.params;

    if (String(req.user._id) === String(id)) {
      return res.status(400).json({
        success: false,
        error: 'You cannot remove your own account',
      });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (targetUser.isAdmin) {
      return res.status(400).json({
        success: false,
        error: 'Admin users cannot be removed from this panel',
      });
    }

    const userProjects = await Project.find({ userId: id }, { _id: 1 }).lean();
    const projectIds = userProjects.map((p) => p._id);

    const deleteTasks = [
      File.deleteMany({ userId: id }),
      Feature.deleteMany({ userId: id }),
      Chat.deleteMany({ userId: id }),
      Project.deleteMany({ userId: id }),
      User.deleteOne({ _id: id }),
    ];

    if (projectIds.length > 0) {
      deleteTasks.push(
        Embedding.deleteMany({ projectId: { $in: projectIds } }),
      );
    }

    await Promise.all(deleteTasks);

    return res.status(200).json({
      success: true,
      message: 'User and associated data removed successfully',
      data: { userId: id, projectsRemoved: projectIds.length },
    });
  } catch (error) {
    console.error('Error removing user:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to remove user' });
  }
}
