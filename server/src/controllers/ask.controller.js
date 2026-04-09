import Chat from '../models/Chat.js';
import {
  askQuestionForProject,
  streamAnswerForProject,
} from '../services/chat.service.js';
import { generateChatTitle } from '../analysis/ai.service.js';
import { findAccessibleProject } from '../utils/projectAccess.js';

const LEGACY_PROJECT_USAGE_NOTE =
  'Project usage note: No relevant files found in this project for this topic.';
const STREAM_NOTE_GUARD_CHARS = LEGACY_PROJECT_USAGE_NOTE.length + 12;

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripLegacyProjectUsageNote(answerText) {
  if (typeof answerText !== 'string' || !answerText) return '';
  const escaped = escapeRegex(LEGACY_PROJECT_USAGE_NOTE);
  const footerPattern = new RegExp(`(?:\\n\\s*)*${escaped}\\s*$`, 'i');
  return answerText.replace(footerPattern, '').trimEnd();
}

function fallbackChatTitle(message) {
  const cleaned = (message || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'New chat';
  return cleaned.length > 56 ? `${cleaned.slice(0, 56)}...` : cleaned;
}

async function buildChatTitle(firstMessage) {
  const fallback = fallbackChatTitle(firstMessage);
  try {
    const aiTitle = await generateChatTitle(firstMessage);
    const normalized = aiTitle
      .replace(/^['"`\s]+|['"`\s]+$/g, '')
      .replace(/[.!?]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!normalized) {
      return { title: fallback, titleSource: 'fallback' };
    }

    return {
      title: normalized.length > 80 ? normalized.slice(0, 80) : normalized,
      titleSource: 'ai',
    };
  } catch {
    return { title: fallback, titleSource: 'fallback' };
  }
}

/**
 * List persisted chats for a project, newest first.
 */
export async function listAskChats(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const project = await findAccessibleProject(id, userId, { _id: 1 });
    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: 'Project not found' });
    }

    const chats = await Chat.find(
      { userId, projectId: id, messageCount: { $gt: 0 } },
      {
        title: 1,
        titleSource: 1,
        messageCount: 1,
        firstMessagePreview: 1,
        lastMessageAt: 1,
        updatedAt: 1,
      },
    )
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .limit(60)
      .lean();

    return res.status(200).json({ success: true, data: chats });
  } catch (error) {
    console.error('Error listing project chats:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to list chats' });
  }
}

/**
 * Get a single persisted chat with all messages.
 */
export async function getAskChat(req, res) {
  try {
    const { id, chatId } = req.params;
    const userId = req.user._id;

    const project = await findAccessibleProject(id, userId, { _id: 1 });
    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: 'Project not found' });
    }

    const chat = await Chat.findOne(
      {
        _id: chatId,
        userId,
        projectId: id,
        messageCount: { $gt: 0 },
      },
      {
        title: 1,
        titleSource: 1,
        messageCount: 1,
        firstMessagePreview: 1,
        lastMessageAt: 1,
        updatedAt: 1,
        messages: 1,
      },
    ).lean();

    if (!chat) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    return res.status(200).json({ success: true, data: chat });
  } catch (error) {
    console.error('Error fetching chat:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch chat' });
  }
}

/**
 * Rename a persisted chat title.
 */
export async function renameAskChat(req, res) {
  try {
    const { id, chatId } = req.params;
    const userId = req.user._id;
    const { title } = req.body || {};

    if (typeof title !== 'string' || !title.trim()) {
      return res
        .status(400)
        .json({ success: false, error: 'title is required' });
    }

    const normalizedTitle = title.replace(/\s+/g, ' ').trim();
    if (normalizedTitle.length > 120) {
      return res.status(400).json({
        success: false,
        error: 'title is too long (max 120 characters)',
      });
    }

    const project = await findAccessibleProject(id, userId, { _id: 1 });
    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: 'Project not found' });
    }

    const updatedChat = await Chat.findOneAndUpdate(
      { _id: chatId, userId, projectId: id, messageCount: { $gt: 0 } },
      { $set: { title: normalizedTitle, titleSource: 'manual' } },
      {
        new: true,
        projection: {
          title: 1,
          titleSource: 1,
          messageCount: 1,
          firstMessagePreview: 1,
          lastMessageAt: 1,
          updatedAt: 1,
        },
      },
    ).lean();

    if (!updatedChat) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    return res.status(200).json({ success: true, data: updatedChat });
  } catch (error) {
    console.error('Error renaming chat:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to rename chat' });
  }
}

/**
 * Delete a persisted chat.
 */
export async function deleteAskChat(req, res) {
  try {
    const { id, chatId } = req.params;
    const userId = req.user._id;

    const project = await findAccessibleProject(id, userId, { _id: 1 });
    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: 'Project not found' });
    }

    const deleted = await Chat.findOneAndDelete({
      _id: chatId,
      userId,
      projectId: id,
    }).lean();

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Chat deleted',
      data: { _id: chatId },
    });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to delete chat' });
  }
}

/**
 * Ask a question against project embeddings and return a grounded answer.
 * POST /project/:id/ask
 */
export async function askQuestion(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { question, history = [], chatId } = req.body || {};

    if (typeof question !== 'string' || !question.trim()) {
      return res
        .status(400)
        .json({ success: false, error: 'question is required' });
    }

    const normalizedQuestion = question.trim();
    if (normalizedQuestion.length > 2000) {
      return res.status(400).json({
        success: false,
        error: 'question is too long (max 2000 characters)',
      });
    }

    const project = await findAccessibleProject(id, userId, {
      _id: 1,
      status: 1,
    });
    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: 'Project not found' });
    }

    if (project.status === 'documenting') {
      return res.status(409).json({
        success: false,
        error: 'Project is still generating documentation and embeddings',
      });
    }

    let activeChat = null;
    if (chatId) {
      activeChat = await Chat.findOne({ _id: chatId, userId, projectId: id });
      if (!activeChat) {
        return res
          .status(404)
          .json({ success: false, error: 'Chat not found' });
      }
    }

    const data = await askQuestionForProject({
      projectId: id,
      question: normalizedQuestion,
      history: Array.isArray(history) ? history : [],
    });

    if (!activeChat) {
      const titleResult = await buildChatTitle(normalizedQuestion);
      activeChat = await Chat.create({
        userId,
        projectId: id,
        title: titleResult.title,
        titleSource: titleResult.titleSource,
        firstMessagePreview: fallbackChatTitle(normalizedQuestion),
        messageCount: 2,
        lastMessageAt: new Date(),
        messages: [
          {
            role: 'user',
            content: normalizedQuestion,
            citations: [],
            createdAt: new Date(),
          },
          {
            role: 'assistant',
            content: data.answer,
            citations: Array.isArray(data.citations) ? data.citations : [],
            createdAt: new Date(),
          },
        ],
      });
    } else {
      const now = new Date();
      const assistantCitations = Array.isArray(data.citations)
        ? data.citations
        : [];

      activeChat.messages.push({
        role: 'user',
        content: normalizedQuestion,
        citations: [],
        createdAt: now,
      });
      activeChat.messages.push({
        role: 'assistant',
        content: data.answer,
        citations: assistantCitations,
        createdAt: now,
      });

      activeChat.messageCount = activeChat.messages.length;
      activeChat.lastMessageAt = now;
      await activeChat.save();
    }

    return res.status(200).json({
      success: true,
      data: {
        ...data,
        chat: {
          _id: activeChat._id,
          title: activeChat.title,
          titleSource: activeChat.titleSource,
          messageCount: activeChat.messageCount,
          firstMessagePreview: activeChat.firstMessagePreview,
          lastMessageAt: activeChat.lastMessageAt,
          updatedAt: activeChat.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error('Error answering project question:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to answer question' });
  }
}

/**
 * Stream an answer via Server-Sent Events.
 * POST /project/:id/ask/stream
 *
 * SSE events sent:
 *   event: citations   — { citations, usage }
 *   event: delta       — { text }          (one per LLM token)
 *   event: done        — { chat }          (after DB save)
 *   event: error       — { error }         (on failure)
 */
export async function streamAskQuestion(req, res) {
  // ── Validate input ──
  let id;
  let userId;
  let normalizedQuestion;
  let history;
  let activeChat = null;

  try {
    ({ id } = req.params);
    userId = req.user._id;

    const body = req.body || {};
    const { question, history: incomingHistory = [], chatId } = body;
    history = incomingHistory;

    if (typeof question !== 'string' || !question.trim()) {
      return res
        .status(400)
        .json({ success: false, error: 'question is required' });
    }

    normalizedQuestion = question.trim();
    if (normalizedQuestion.length > 2000) {
      return res.status(400).json({
        success: false,
        error: 'question is too long (max 2000 characters)',
      });
    }

    const project = await findAccessibleProject(id, userId, {
      _id: 1,
      status: 1,
    });
    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: 'Project not found' });
    }

    if (project.status === 'documenting') {
      return res.status(409).json({
        success: false,
        error: 'Project is still generating documentation and embeddings',
      });
    }

    if (chatId) {
      activeChat = await Chat.findOne({ _id: chatId, userId, projectId: id });
      if (!activeChat) {
        return res
          .status(404)
          .json({ success: false, error: 'Chat not found' });
      }
    }
  } catch (error) {
    console.error('Error validating streaming request:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to validate request' });
  }

  // ── SSE headers ──
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const sendSSE = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // ── Retrieval (non-streaming) then stream answer ──
    const { stream, citations, usage } = await streamAnswerForProject({
      projectId: id,
      question: normalizedQuestion,
      history: Array.isArray(history) ? history : [],
    });

    // Send citations immediately so the client can display them
    sendSSE('citations', { citations, usage });

    // Stream LLM tokens
    let fullAnswer = '';
    let pendingTail = '';
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        pendingTail += delta;

        // Keep a short trailing buffer unsent so we can safely detect/suppress
        // the legacy footer when it appears at the very end of a streamed answer.
        if (pendingTail.length > STREAM_NOTE_GUARD_CHARS) {
          const emitLength = pendingTail.length - STREAM_NOTE_GUARD_CHARS;
          const safeChunk = pendingTail.slice(0, emitLength);
          pendingTail = pendingTail.slice(emitLength);

          if (safeChunk) {
            fullAnswer += safeChunk;
            sendSSE('delta', { text: safeChunk });
          }
        }
      }
    }

    const cleanedTail = stripLegacyProjectUsageNote(pendingTail);
    if (cleanedTail) {
      fullAnswer += cleanedTail;
      sendSSE('delta', { text: cleanedTail });
    }

    fullAnswer = stripLegacyProjectUsageNote(fullAnswer);

    if (!fullAnswer.trim()) {
      fullAnswer = 'I could not generate an answer from the available context.';
    }

    // ── Persist to DB ──
    if (!activeChat) {
      const preview = fallbackChatTitle(normalizedQuestion);
      const titleResult = await buildChatTitle(normalizedQuestion);

      activeChat = await Chat.create({
        userId,
        projectId: id,
        title: titleResult.title,
        titleSource: titleResult.titleSource,
        firstMessagePreview: preview,
        messageCount: 2,
        lastMessageAt: new Date(),
        messages: [
          {
            role: 'user',
            content: normalizedQuestion,
            citations: [],
            createdAt: new Date(),
          },
          {
            role: 'assistant',
            content: fullAnswer,
            citations: Array.isArray(citations) ? citations : [],
            createdAt: new Date(),
          },
        ],
      });
    } else {
      const now = new Date();
      activeChat.messages.push({
        role: 'user',
        content: normalizedQuestion,
        citations: [],
        createdAt: now,
      });
      activeChat.messages.push({
        role: 'assistant',
        content: fullAnswer,
        citations: Array.isArray(citations) ? citations : [],
        createdAt: now,
      });
      activeChat.messageCount = activeChat.messages.length;
      activeChat.lastMessageAt = now;
      await activeChat.save();
    }

    // Final event with chat metadata
    sendSSE('done', {
      chat: {
        _id: activeChat._id,
        title: activeChat.title,
        titleSource: activeChat.titleSource,
        messageCount: activeChat.messageCount,
        firstMessagePreview: activeChat.firstMessagePreview,
        lastMessageAt: activeChat.lastMessageAt,
        updatedAt: activeChat.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error in streaming answer:', error);
    sendSSE('error', { error: 'Failed to answer question' });
  } finally {
    res.end();
  }
}
