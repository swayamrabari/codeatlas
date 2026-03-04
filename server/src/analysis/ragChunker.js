import File from '../models/File.js';
import Feature from '../models/Feature.js';
import Project from '../models/Project.js';

const CODE_CHUNK_LINES = 100;
const CODE_CHUNK_OVERLAP = 20;

/**
 * Build all chunks for a project (files, features, project-level).
 * Each chunk is an object with { chunkType, content, metadata }.
 * @param {string} projectId - MongoDB project ID.
 * @returns {Object[]} Array of chunk objects.
 */
export async function buildChunks(projectId) {
  const [files, features, project] = await Promise.all([
    File.find({ projectId }).lean(),
    Feature.find({ projectId }).lean(),
    Project.findById(projectId).lean(),
  ]);

  const projectType = project?.stats?.projectType || 'unknown';
  const projectFrameworks = project?.stats?.frameworks || {};
  const chunks = [];

  // ── File Chunks ──
  for (const file of files) {
    const tier = file.analysis?.tier ?? 3;
    const baseMeta = {
      path: file.path,
      tier,
      role: file.analysis?.role || 'Unknown',
      category: file.analysis?.category || 'infrastructure',
    };

    // File code chunks (Tier 1 only) — sliding window
    if (tier === 1 && file.content) {
      const lines = file.content.split('\n');
      const step = CODE_CHUNK_LINES - CODE_CHUNK_OVERLAP;
      const totalChunks = Math.max(
        1,
        Math.ceil((lines.length - CODE_CHUNK_OVERLAP) / step),
      );

      for (let i = 0, idx = 0; i < lines.length; i += step, idx++) {
        const lineStart = i + 1;
        const lineEnd = Math.min(i + CODE_CHUNK_LINES, lines.length);
        const chunkContent = lines.slice(i, lineEnd).join('\n');

        if (chunkContent.trim()) {
          chunks.push({
            chunkType: 'code',
            content: chunkContent,
            metadata: {
              ...baseMeta,
              chunkIndex: idx,
              totalChunks,
              lineStart,
              lineEnd,
            },
          });
        }

        // Stop if we've reached the end
        if (lineEnd >= lines.length) break;
      }
    }

    // File summary chunks (all tiers)
    if (file.aiDocumentation?.shortSummary) {
      chunks.push({
        chunkType: 'file-summary',
        content: file.aiDocumentation.shortSummary,
        metadata: {
          ...baseMeta,
          searchTags: file.aiDocumentation.searchTags || [],
          projectType,
        },
      });
    }

    // File docs chunks (Tier 1 & 2 only)
    if (tier <= 2 && file.aiDocumentation?.detailedSummary) {
      chunks.push({
        chunkType: 'file-docs',
        content: file.aiDocumentation.detailedSummary,
        metadata: {
          ...baseMeta,
          searchTags: file.aiDocumentation.searchTags || [],
          projectType,
        },
      });
    }
  }

  // ── Feature Chunks ──
  for (const feature of features) {
    const featureMeta = {
      featureName: feature.name,
      searchTags: feature.aiDocumentation?.searchTags || [],
      projectType,
    };

    if (feature.aiDocumentation?.shortSummary) {
      chunks.push({
        chunkType: 'feature-summary',
        content: feature.aiDocumentation.shortSummary,
        metadata: featureMeta,
      });
    }

    if (feature.aiDocumentation?.detailedSummary) {
      chunks.push({
        chunkType: 'feature-docs',
        content: feature.aiDocumentation.detailedSummary,
        metadata: featureMeta,
      });
    }
  }

  // ── Project Chunk ──
  if (project?.aiDocumentation?.detailedSummary) {
    chunks.push({
      chunkType: 'project-docs',
      content: project.aiDocumentation.detailedSummary,
      metadata: {
        projectType,
        projectFrameworks,
        searchTags: project.aiDocumentation.searchTags || [],
      },
    });
  }

  return chunks;
}

/**
 * Build the prefixed embedding input string for a chunk.
 * Adds structured metadata prefixes to improve embedding quality.
 * @param {Object} chunk - Chunk object with chunkType, content, metadata.
 * @returns {string} Embedding input string.
 */
export function buildEmbeddingInput(chunk) {
  const { chunkType, content, metadata } = chunk;

  switch (chunkType) {
    case 'file-summary':
    case 'file-docs':
      return [
        `FILE: ${metadata.path}`,
        `ROLE: ${metadata.role}`,
        `CATEGORY: ${metadata.category}`,
        `TAGS: ${(metadata.searchTags || []).join(', ')}`,
        '',
        content,
      ].join('\n');

    case 'code':
      return [
        `FILE: ${metadata.path}`,
        `ROLE: ${metadata.role}`,
        `LINES: ${metadata.lineStart}–${metadata.lineEnd}`,
        '',
        content,
      ].join('\n');

    case 'feature-summary':
    case 'feature-docs':
      return [
        `FEATURE: ${metadata.featureName}`,
        `TAGS: ${(metadata.searchTags || []).join(', ')}`,
        '',
        content,
      ].join('\n');

    case 'project-docs':
      return [
        `PROJECT TYPE: ${metadata.projectType}`,
        `FRAMEWORKS: ${JSON.stringify(metadata.projectFrameworks || {})}`,
        `TAGS: ${(metadata.searchTags || []).join(', ')}`,
        '',
        content,
      ].join('\n');

    default:
      return content;
  }
}
