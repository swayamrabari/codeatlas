import mongoose from 'mongoose';

const apiRouteSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      required: true,
    },
    path: { type: String, required: true },
  },
  { _id: false },
);

const featureSchema = new mongoose.Schema(
  {
    // Identity
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
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
    keyword: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    // File references
    fileIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'File',
      },
    ],
    fileCount: {
      type: Number,
      default: 0,
    },

    // Categorized file paths (quick lookup without joins)
    categorizedFiles: {
      frontend: [String],
      backend: [String],
      shared: [String],
      models: [String],
      routes: [String],
      controllers: [String],
      pages: [String],
      components: [String],
      api: [String],
      utils: [String],
      middleware: [String],
      config: [String],
      stores: [String],
      services: [String],
    },

    // Derived data
    apiRoutes: [apiRouteSchema],

    // Shared infrastructure dependencies (UI components, utils, etc.)
    // Tracked separately from feature files to keep features lean
    sharedDependencies: [String],

    // AI Documentation (populated later)
    aiDocumentation: {
      shortSummary: { type: String, default: null },
      detailedSummary: { type: String, default: null },
      flowDiagram: { type: String, default: null },
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
featureSchema.index({ projectId: 1 });
featureSchema.index({ userId: 1 });
featureSchema.index({ projectId: 1, keyword: 1 }, { unique: true });

export default mongoose.model('Feature', featureSchema);
