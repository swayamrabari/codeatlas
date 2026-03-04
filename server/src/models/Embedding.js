import mongoose from 'mongoose';

/**
 * Embedding Model — stores vector embeddings for RAG search.
 *
 * IMPORTANT: A MongoDB Atlas Vector Search index must be created manually
 * on the `embeddings` collection. Create it in Atlas UI or via Admin API:
 *
 * Index name: "vector_index"
 * Index definition:
 * {
 *   "fields": [
 *     {
 *       "type": "vector",
 *       "path": "embedding",
 *       "numDimensions": 1536,
 *       "similarity": "cosine"
 *     },
 *     {
 *       "type": "filter",
 *       "path": "projectId"
 *     },
 *     {
 *       "type": "filter",
 *       "path": "chunkType"
 *     }
 *   ]
 * }
 */

const embeddingSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    chunkType: {
      type: String,
      enum: [
        'code',
        'file-summary',
        'file-docs',
        'feature-summary',
        'feature-docs',
        'project-docs',
      ],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    embedding: {
      type: [Number],
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for query performance
embeddingSchema.index({ projectId: 1 });
embeddingSchema.index({ projectId: 1, chunkType: 1 });

export default mongoose.model('Embedding', embeddingSchema);
