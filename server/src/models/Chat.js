import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 8000,
    },
    citations: {
      type: [
        {
          path: { type: String, default: null },
          lineStart: { type: Number, default: null },
          lineEnd: { type: Number, default: null },
          chunkType: { type: String, default: null },
          score: { type: Number, default: 0 },
          featureName: { type: String, default: null },
          _id: false,
        },
      ],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const chatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    titleSource: {
      type: String,
      enum: ['ai', 'manual', 'fallback'],
      default: 'fallback',
    },
    messages: {
      type: [chatMessageSchema],
      default: [],
    },
    messageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    firstMessagePreview: {
      type: String,
      default: '',
      maxlength: 280,
    },
    lastMessageAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

chatSchema.index({ userId: 1, projectId: 1, updatedAt: -1 });
chatSchema.index({ userId: 1, projectId: 1, lastMessageAt: -1 });

export default mongoose.model('Chat', chatSchema);
