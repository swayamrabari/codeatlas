import Embedding from '../models/Embedding.js';
import { generateEmbeddings } from './ai.service.js';
import { buildChunks, buildEmbeddingInput } from './ragChunker.js';
import { logger } from '../utils/logger.js';

const EMBEDDING_BATCH_SIZE = 10;
const EMBEDDING_BATCH_DELAY_MS = 1000;

/**
 * Build chunks, generate embeddings, and store them in the `embeddings` collection.
 * Replaces any existing embeddings for the project.
 * @param {string} projectId - MongoDB project ID.
 */
export async function storeEmbeddings(projectId) {
  // 1. Remove existing embeddings for this project
  await Embedding.deleteMany({ projectId });

  // 2. Build all chunks
  const chunks = await buildChunks(projectId);

  if (chunks.length === 0) {
    logger.info('No chunks to embed; skipping embedding step');
    return;
  }

  logger.info(`Built ${chunks.length} chunks for embedding`);

  // 3. Build embedding inputs
  const embeddingInputs = chunks.map(buildEmbeddingInput);

  // 4. Batch-embed and store
  const documents = [];

  for (let i = 0; i < embeddingInputs.length; i += EMBEDDING_BATCH_SIZE) {
    const batchTexts = embeddingInputs.slice(i, i + EMBEDDING_BATCH_SIZE);
    const batchChunks = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
    const batchNum = Math.floor(i / EMBEDDING_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(
      embeddingInputs.length / EMBEDDING_BATCH_SIZE,
    );

    try {
      logger.info(
        `Embedding batch ${batchNum}/${totalBatches} (${batchTexts.length} texts)`,
      );

      const vectors = await generateEmbeddings(batchTexts);

      for (let j = 0; j < batchChunks.length; j++) {
        documents.push({
          projectId,
          chunkType: batchChunks[j].chunkType,
          content: batchChunks[j].content,
          embedding: vectors[j],
          metadata: batchChunks[j].metadata,
        });
      }
    } catch (err) {
      logger.error(
        `Embedding batch ${batchNum} failed after retries; skipping batch`,
        err.message,
      );
    }

    // Delay between batches (except the last one)
    if (i + EMBEDDING_BATCH_SIZE < embeddingInputs.length) {
      await new Promise((r) => setTimeout(r, EMBEDDING_BATCH_DELAY_MS));
    }
  }

  // 5. Bulk insert all documents
  if (documents.length > 0) {
    await Embedding.insertMany(documents, { ordered: false });
    logger.info(`Stored ${documents.length} embeddings in the database`);
  } else {
    logger.warn('No embeddings were generated successfully');
  }
}
