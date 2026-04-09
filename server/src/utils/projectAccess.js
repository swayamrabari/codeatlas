import Project from '../models/Project.js';

function toUserIdString(userId) {
  return String(userId || '');
}

export function buildAccessibleProjectQuery(projectId, userId) {
  return {
    _id: projectId,
    $or: [{ userId }, { 'sharedWith.userId': userId }],
  };
}

export function findAccessibleProject(projectId, userId, projection = {}) {
  return Project.findOne(
    buildAccessibleProjectQuery(projectId, userId),
    projection,
  );
}

export function isProjectOwner(project, userId) {
  const ownerId = project?.userId?._id || project?.userId;
  return toUserIdString(ownerId) === toUserIdString(userId);
}
