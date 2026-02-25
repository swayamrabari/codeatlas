import mongoose from 'mongoose';

// ── Import Item Sub-Schema ──
// No required/enum constraints — scanner output is trusted and may evolve.
const importItemSchema = new mongoose.Schema(
  {
    path: { type: String, default: '' },
    value: { type: String, default: '' },
    type: { type: String, default: 'esm' },
    imported: [String],
    resolvedPath: { type: String, default: null },
  },
  { _id: false, strict: false },
);

// ── Export Item Sub-Schema ──
const exportItemSchema = new mongoose.Schema(
  {
    type: { type: String, default: 'es_named' },
    name: { type: String, default: '' },
    kind: { type: String, default: 'unknown' },
  },
  { _id: false, strict: false },
);

// ── Route Item Sub-Schema ──
const routeItemSchema = new mongoose.Schema(
  {
    method: { type: String, default: '' },
    path: { type: String, default: '' },
  },
  { _id: false, strict: false },
);

// ── Analysis Sub-Schema (mirrors demoOutput.json per-file structure) ──
// All fields optional with defaults — never reject a file due to missing analysis.
const analysisSchema = new mongoose.Schema(
  {
    type: { type: String, default: 'unknown' },
    role: { type: String, default: 'Unknown' },
    category: { type: String, default: 'infrastructure' },
    behavior: { type: String, default: 'logic' },
    routes: { type: [mongoose.Schema.Types.Mixed], default: [] },
    imports: {
      count: { type: Number, default: 0 },
      files: [String],
      items: [importItemSchema],
    },
    importedBy: [String],
    exportsCount: { type: Number, default: 0 },
    exports: [exportItemSchema],
  },
  { _id: false, strict: false },
);

// ── Main File Schema ──
const fileSchema = new mongoose.Schema(
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
    path: {
      type: String,
      required: true,
      trim: true,
    },
    extension: {
      type: String,
      default: '',
    },
    size: {
      type: Number,
      default: 0,
    },
    lineCount: {
      type: Number,
      default: 0,
    },

    // Raw source code
    content: {
      type: String,
      default: null,
    },

    // Deterministic analysis from scanner
    analysis: {
      type: analysisSchema,
      default: null,
    },

    // AI Documentation (populated later)
    aiDocumentation: {
      shortSummary: { type: String, default: null },
      detailedSummary: { type: String, default: null },
      mermaidDiagram: { type: String, default: null },
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
fileSchema.index({ projectId: 1 });
fileSchema.index({ projectId: 1, path: 1 }, { unique: true });
fileSchema.index({ userId: 1 });
fileSchema.index({ projectId: 1, 'analysis.category': 1 });
fileSchema.index({ projectId: 1, 'analysis.type': 1 });

export default mongoose.model('File', fileSchema);
