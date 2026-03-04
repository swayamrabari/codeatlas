import { EventEmitter } from 'events';

/**
 * Singleton EventEmitter for broadcasting documentation pipeline progress.
 *
 * Events are namespaced per project:
 *   progressEmitter.emit(`progress:${projectId}`, { step, detail, progress })
 *
 * Steps (in order):
 *   'file-docs'    — Generating file-level documentation
 *   'feature-docs' — Generating feature documentation
 *   'project-docs' — Generating project overview
 *   'embeddings'   — Building search embeddings
 *   'done'         — Pipeline complete
 *   'error'        — Pipeline failed
 */
const progressEmitter = new EventEmitter();
progressEmitter.setMaxListeners(200);

export default progressEmitter;
