import Project from '../models/Project.js';
import { generateDocumentation } from './docGenerator.js';
import progressEmitter from './progressEmitter.js';

/**
 * Trigger the AI documentation pipeline as a background task.
 * Does NOT await — fire-and-forget after the upload response is sent.
 *
 * Status transitions: ready → documenting → ready
 * On failure: logs error, reverts to ready (docs are optional enrichment).
 *
 * @param {string} projectId - MongoDB project ID.
 */
export function triggerDocumentation(projectId) {
  // Guard: skip if no OpenAI key configured
  if (!process.env.OPENAI_API_KEY) {
    console.warn(
      '⚠ OPENAI_API_KEY not set — skipping AI documentation generation.',
    );
    return;
  }

  // Fire-and-forget (intentionally not awaited)
  _runPipeline(projectId).catch((err) => {
    console.error(
      `❌ [DocGen] Unhandled error in background pipeline for ${projectId}:`,
      err,
    );
  });
}

async function _runPipeline(projectId) {
  try {
    // Transition: ready → documenting, reset docProgress
    await Project.updateOne(
      { _id: projectId },
      {
        status: 'documenting',
        docProgress: {
          step: 'file-docs',
          detail: 'Starting...',
          completedSteps: [],
        },
      },
    );

    await generateDocumentation(projectId);

    // Transition: documenting → ready
    await Project.updateOne(
      { _id: projectId },
      {
        status: 'ready',
        'docProgress.step': 'done',
        'docProgress.detail': 'Complete',
      },
    );
  } catch (err) {
    console.error(
      `❌ [DocGen] Pipeline failed for project ${projectId}: ${err.message}`,
    );

    // Emit error to any connected SSE clients
    progressEmitter.emit(`progress:${projectId}`, {
      step: 'error',
      detail: err.message,
    });

    // Revert to ready — docs are optional, project is still usable
    await Project.updateOne(
      { _id: projectId },
      {
        status: 'ready',
        'docProgress.step': 'error',
        'docProgress.detail': err.message,
        'metadata.errorMessage': `Documentation generation failed: ${err.message}`,
      },
    ).catch(() => {}); // Don't let the revert itself crash
  }
}
