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
    categorizedFiles: {
      frontend: [String],
      backend: [String],
      shared: [String],
      models: [String],
      routes: [String],
      controllers: [String],
      middleware: [String],
      services: [String],
      config: [String],
      jobs: [String],
      events: [String],
      migrations: [String],
      seeds: [String],
      validators: [String],
      pages: [String],
      components: [String],
      hooks: [String],
      contexts: [String],
      stores: [String],
      api: [String],
      layouts: [String],
      guards: [String],
      styles: [String],
      assets: [String],
      utils: [String],
      types: [String],
      constants: [String],
      tests: [String],
      mocks: [String],
      other: [String],
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
