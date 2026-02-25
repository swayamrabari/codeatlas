import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    uploadType: {
      type: String,
      enum: ['zip', 'github'],
      required: true,
    },
    status: {
      type: String,
      enum: [
        'uploading',
        'scanning',
        'analyzing',
        'documenting',
        'ready',
        'failed',
      ],
      default: 'uploading',
    },

    // ── Deterministic Stats ──
    stats: {
      totalFiles: { type: Number, default: 0 },
      projectType: { type: String, default: '' },
      frameworks: {
        backend: [String],
        frontend: [String],
        database: [String],
        tooling: [String],
      },
      relationshipStats: {
        totalRelationships: { type: Number, default: 0 },
        importRelationships: { type: Number, default: 0 },
        usesRelationships: { type: Number, default: 0 },
        filesInGraph: { type: Number, default: 0 },
      },
      featureCount: { type: Number, default: 0 },
    },

    // ── Relationships Graph (project-wide edges) ──
    relationships: [
      {
        from: { type: String, required: true },
        to: { type: String, required: true },
        type: {
          type: String,
          enum: ['imports', 'uses'],
          required: true,
        },
        _id: false,
      },
    ],

    // ── AI Documentation (Project Level) — populated later ──
    aiDocumentation: {
      overviewShort: { type: String, default: null },
      overviewDetailed: { type: String, default: null },
      architectureDiagram: { type: String, default: null },
    },

    // ── Processing Metadata ──
    metadata: {
      uploadedAt: { type: Date, default: null },
      scanCompletedAt: { type: Date, default: null },
      analysisCompletedAt: { type: Date, default: null },
      errorMessage: { type: String, default: null },
      processingTimeMs: { type: Number, default: null },
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
projectSchema.index({ userId: 1 });
projectSchema.index({ createdAt: -1 });
projectSchema.index({ userId: 1, status: 1 });

export default mongoose.model('Project', projectSchema);
