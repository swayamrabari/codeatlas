import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { projectAPI } from '../services/api';
import LogoIcon from '@/assets/logo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Plus,
  History,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import {
  buildProjectTabStateKey,
  usePersistentState,
} from '@/hooks/usePersistentState';

function mapStoredMessages(messages = []) {
  return messages
    .filter(
      (message) =>
        message &&
        (message.role === 'user' || message.role === 'assistant') &&
        typeof message.content === 'string',
    )
    .map((message, index) => ({
      id: `${message.createdAt || 'msg'}-${index}`,
      role: message.role,
      content: message.content,
      citations: Array.isArray(message.citations) ? message.citations : [],
      streaming: false,
    }));
}

export default function Ask({ projectId }) {
  const queryClient = useQueryClient();
  const chatIdStorageKey = buildProjectTabStateKey(projectId, 'ask', 'chat-id');
  const chatTitleStorageKey = buildProjectTabStateKey(
    projectId,
    'ask',
    'chat-title',
  );
  const draftStorageKey = buildProjectTabStateKey(projectId, 'ask', 'draft');

  const [messages, setMessages] = useState([]);
  const [currentChatId, setCurrentChatId] = usePersistentState(
    chatIdStorageKey,
    null,
  );
  const [currentChatTitle, setCurrentChatTitle] = usePersistentState(
    chatTitleStorageKey,
    'New chat',
  );

  const {
    data: chatsRes,
    isLoading: recentLoading,
    error: queryError,
  } = useQuery({
    queryKey: ['projectChats', projectId],
    queryFn: () => projectAPI.listProjectChats(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  const recentError =
    queryError?.message || (queryError ? 'Failed to load recent chats.' : '');
  const recentChats = Array.isArray(chatsRes?.data) ? chatsRes.data : [];

  const [loadingChatId, setLoadingChatId] = useState('');
  const [deletingChatId, setDeletingChatId] = useState('');

  const [editingChatId, setEditingChatId] = useState('');
  const [editingTitle, setEditingTitle] = useState('');
  const [renaming, setRenaming] = useState(false);

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetChat, setDeleteTargetChat] = useState(null);

  const [question, setQuestion] = usePersistentState(draftStorageKey, '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recentOpen, setRecentOpen] = useState(false);
  const [stickToBottom, setStickToBottom] = useState(true);

  const inputRef = useRef(null);
  const chatViewportRef = useRef(null);
  const streamBufferRef = useRef('');
  const streamTimerRef = useRef(null);
  const streamMessageIdRef = useRef('');
  const restoredProjectRef = useRef('');

  const history = useMemo(
    () =>
      messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: m.content }))
        .slice(-8),
    [messages],
  );

  const resizeInput = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  useEffect(() => {
    resizeInput();
  }, [question, resizeInput]);

  const appendToStreamingMessage = useCallback((messageId, text) => {
    if (!messageId || !text) return;

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, content: msg.content + text } : msg,
      ),
    );
  }, []);

  const stopTypingAnimation = useCallback(
    ({ flush = false } = {}) => {
      if (streamTimerRef.current) {
        clearTimeout(streamTimerRef.current);
        streamTimerRef.current = null;
      }

      if (flush && streamBufferRef.current && streamMessageIdRef.current) {
        appendToStreamingMessage(
          streamMessageIdRef.current,
          streamBufferRef.current,
        );
      }

      streamBufferRef.current = '';
    },
    [appendToStreamingMessage],
  );

  const startTypingAnimation = useCallback(
    (messageId) => {
      stopTypingAnimation();
      streamMessageIdRef.current = messageId;

      const tick = () => {
        if (!streamMessageIdRef.current) return;

        const pending = streamBufferRef.current;
        if (pending.length > 0) {
          const step =
            pending.length > 180
              ? 12
              : pending.length > 100
                ? 8
                : pending.length > 40
                  ? 4
                  : 1;
          const next = pending.slice(0, step);
          streamBufferRef.current = pending.slice(step);
          appendToStreamingMessage(streamMessageIdRef.current, next);
        }

        streamTimerRef.current = window.setTimeout(tick, 20);
      };

      tick();
    },
    [appendToStreamingMessage, stopTypingAnimation],
  );

  const finalizeStreamingMessage = useCallback(
    (messageId) => {
      stopTypingAnimation({ flush: true });
      streamMessageIdRef.current = '';
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, streaming: false } : msg,
        ),
      );
    },
    [stopTypingAnimation],
  );

  const upsertRecentChat = useCallback(
    (chat) => {
      if (!chat?._id) return;

      queryClient.setQueryData(['projectChats', projectId], (prev) => {
        const prevChats = Array.isArray(prev?.data) ? prev.data : [];
        const withoutCurrent = prevChats.filter(
          (item) => item._id !== chat._id,
        );
        const updated = [chat, ...withoutCurrent]
          .sort(
            (a, b) =>
              new Date(b.lastMessageAt || b.updatedAt || 0).getTime() -
              new Date(a.lastMessageAt || a.updatedAt || 0).getTime(),
          )
          .slice(0, 60);

        return { ...prev, data: updated };
      });
    },
    [projectId, queryClient],
  );

  useEffect(() => {
    restoredProjectRef.current = '';
    setMessages([]);
    streamBufferRef.current = '';
    streamMessageIdRef.current = '';
    stopTypingAnimation();
    setLoading(false);
    setError('');
    setRecentOpen(false);
    setStickToBottom(true);
    setLoadingChatId('');
    setDeletingChatId('');
    setRenaming(false);
    setEditingChatId('');
    setEditingTitle('');
    setDeleteDialogOpen(false);
    setDeleteTargetChat(null);
  }, [projectId, stopTypingAnimation]);

  useEffect(() => {
    const viewport = chatViewportRef.current?.querySelector(
      '[data-slot="scroll-area-viewport"]',
    );
    if (!viewport) return;

    const onScroll = () => {
      const distanceFromBottom =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      setStickToBottom(distanceFromBottom < 80);
    };

    onScroll();
    viewport.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      viewport.removeEventListener('scroll', onScroll);
    };
  }, []);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    const viewport = chatViewportRef.current?.querySelector(
      '[data-slot="scroll-area-viewport"]',
    );
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    if (!stickToBottom) return;
    scrollToBottom(loading ? 'auto' : 'smooth');
  }, [messages, loading, stickToBottom, scrollToBottom]);

  useEffect(() => {
    return () => {
      stopTypingAnimation();
    };
  }, [stopTypingAnimation]);

  const submitQuestion = async (value) => {
    const trimmed = value.trim();
    if (!trimmed || loading) return;

    setError('');
    setQuestion('');
    setStickToBottom(true);

    const userMsgId = crypto.randomUUID();
    const assistantMsgId = crypto.randomUUID();

    // Add user message immediately
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: 'user', content: trimmed },
    ]);

    // Add a placeholder assistant message that will be filled token-by-token
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        citations: [],
        streaming: true,
      },
    ]);

    setLoading(true);
    startTypingAnimation(assistantMsgId);

    try {
      const response = await projectAPI.askProjectQuestionStream(
        projectId,
        trimmed,
        history,
        currentChatId,
      );

      const reader = response.body
        .pipeThrough(new TextDecoderStream())
        .getReader();

      let buffer = '';

      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;

        buffer += chunk;

        // Parse complete SSE messages from the buffer
        const parts = buffer.split('\n\n');
        // Keep the last (possibly incomplete) part in the buffer
        buffer = parts.pop() || '';

        for (const part of parts) {
          if (!part.trim()) continue;

          let eventType = 'message';
          let dataStr = '';

          for (const line of part.split('\n')) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              dataStr += line.slice(6);
            }
          }

          if (!dataStr) continue;

          let data;
          try {
            data = JSON.parse(dataStr);
          } catch {
            continue;
          }

          if (eventType === 'delta') {
            if (typeof data.text === 'string' && data.text) {
              streamBufferRef.current += data.text;
            }
          } else if (eventType === 'citations') {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? {
                      ...msg,
                      citations: Array.isArray(data.citations)
                        ? data.citations
                        : [],
                    }
                  : msg,
              ),
            );
          } else if (eventType === 'done') {
            if (data.chat?._id) {
              setCurrentChatId(data.chat._id);
              setCurrentChatTitle(data.chat.title || 'New chat');
              upsertRecentChat(data.chat);
            }
          } else if (eventType === 'error') {
            setError(data.error || 'Failed to get answer. Please try again.');
          }
        }
      }
    } catch (err) {
      const apiError = err?.response?.data?.error;
      setError(apiError || 'Failed to get answer. Please try again.');
    } finally {
      finalizeStreamingMessage(assistantMsgId);
      setLoading(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    await submitQuestion(question);
  };

  const onInputKeyDown = async (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      await submitQuestion(question);
    }
  };

  const onStartNewChat = () => {
    streamBufferRef.current = '';
    streamMessageIdRef.current = '';
    stopTypingAnimation();
    setMessages([]);
    setCurrentChatId(null);
    setCurrentChatTitle('New chat');
    setError('');
    setQuestion('');
    setEditingChatId('');
    setEditingTitle('');
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      resizeInput();
      scrollToBottom('auto');
    });
  };

  const onOpenRecentChat = useCallback(
    async (chatId, { closeRecent = true, silent = false } = {}) => {
      if (!chatId || loadingChatId || renaming) return;

      setLoadingChatId(chatId);
      setError('');
      stopTypingAnimation();
      streamBufferRef.current = '';
      streamMessageIdRef.current = '';
      try {
        const response = await projectAPI.getProjectChat(projectId, chatId);
        const chat = response?.data?.data || response?.data;
        if (!chat?._id) return;

        setCurrentChatId(chat._id);
        setCurrentChatTitle(chat.title || 'New chat');
        setMessages(mapStoredMessages(chat.messages));
        setQuestion('');
        if (closeRecent) setRecentOpen(false);
        setStickToBottom(true);
        upsertRecentChat(chat);
      } catch (err) {
        if (silent) {
          setCurrentChatId(null);
          setCurrentChatTitle('New chat');
          setMessages([]);
        } else {
          const apiError = err?.response?.data?.error;
          setError(apiError || 'Failed to load chat. Please try again.');
        }
      } finally {
        setLoadingChatId('');
      }
    },
    [
      loadingChatId,
      renaming,
      projectId,
      stopTypingAnimation,
      setCurrentChatId,
      setCurrentChatTitle,
      setQuestion,
      upsertRecentChat,
    ],
  );

  useEffect(() => {
    if (!projectId || restoredProjectRef.current === projectId) return;

    let storedChatId = null;
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(chatIdStorageKey);
        storedChatId = raw ? JSON.parse(raw) : null;
      } catch {
        storedChatId = null;
      }
    }

    // Wait until the persisted-state hook has synced this project's key.
    if (currentChatId !== storedChatId) return;

    restoredProjectRef.current = projectId;

    if (!storedChatId) {
      setMessages([]);
      setCurrentChatTitle('New chat');
      return;
    }

    onOpenRecentChat(storedChatId, { closeRecent: false, silent: true });
  }, [
    chatIdStorageKey,
    currentChatId,
    onOpenRecentChat,
    projectId,
    setCurrentChatTitle,
  ]);

  // ── Rename helpers ──
  const onStartRename = (chat) => {
    setEditingChatId(chat._id);
    setEditingTitle(chat.title || '');
  };

  const onCancelRename = () => {
    setEditingChatId('');
    setEditingTitle('');
  };

  const onSaveRename = async () => {
    const title = editingTitle.replace(/\s+/g, ' ').trim();
    if (!editingChatId || !title || renaming) return;

    setRenaming(true);
    try {
      const response = await projectAPI.renameProjectChat(
        projectId,
        editingChatId,
        title,
      );
      const updated = response?.data?.data || response?.data;
      if (updated?._id) {
        upsertRecentChat(updated);
        if (updated._id === currentChatId) {
          setCurrentChatTitle(updated.title || 'New chat');
        }
      }
      onCancelRename();
    } catch (err) {
      const apiError = err?.response?.data?.error;
      setError(apiError || 'Failed to rename chat.');
    } finally {
      setRenaming(false);
    }
  };

  // ── Delete helpers ──
  const onRequestDelete = (chat) => {
    setDeleteTargetChat(chat);
    setDeleteDialogOpen(true);
  };

  const onConfirmDelete = async () => {
    const chatId = deleteTargetChat?._id;
    if (!chatId || deletingChatId) return;

    setDeletingChatId(chatId);
    setError('');
    try {
      await projectAPI.deleteProjectChat(projectId, chatId);

      queryClient.setQueryData(['projectChats', projectId], (prev) => {
        const prevChats = Array.isArray(prev?.data) ? prev.data : [];
        const updated = prevChats.filter((item) => item._id !== chatId);
        return { ...prev, data: updated };
      });

      if (editingChatId === chatId) {
        onCancelRename();
      }

      if (currentChatId === chatId) {
        streamBufferRef.current = '';
        streamMessageIdRef.current = '';
        stopTypingAnimation();
        setMessages([]);
        setCurrentChatId(null);
        setCurrentChatTitle('New chat');
      }
    } catch (err) {
      const apiError = err?.response?.data?.error;
      setError(apiError || 'Failed to delete chat.');
    } finally {
      setDeletingChatId('');
      setDeleteDialogOpen(false);
      setDeleteTargetChat(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
      <section className="shrink-0 border-b bg-background/90 backdrop-blur">
        <div className="flex w-full items-center justify-between px-10 py-2">
          <p className="max-w-[70%] truncate text-sm font-semibold text-foreground/90">
            {currentChatTitle}
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              aria-label="Start a new chat"
              onClick={onStartNewChat}
            >
              <Plus className="size-4" />
              New
            </Button>

            {/* ── Recent Chats Popover ── */}
            <Popover open={recentOpen} onOpenChange={setRecentOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Open chat history"
                >
                  <History className="size-4" />
                  Recent
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-100 p-0" sideOffset={8}>
                <div className="border-b px-4 py-3">
                  <p className="text-lg font-semibold">Recent Chats</p>
                  <p className="text-sm text-muted-foreground">
                    Your persisted chats for this project.
                  </p>
                </div>

                <ScrollArea className="max-h-[50vh] p-1">
                  {recentLoading ? (
                    <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
                      <Spinner className="h-4 w-4" />
                      Loading recent chats...
                    </div>
                  ) : recentError ? (
                    <p className="px-2 py-3 text-sm text-destructive">
                      {recentError}
                    </p>
                  ) : recentChats.length === 0 ? (
                    <p className="px-2 py-3 text-sm text-muted-foreground">
                      No recent chats yet.
                    </p>
                  ) : (
                    <div className="space-y-0.5">
                      {recentChats.map((item) => (
                        <div
                          key={item._id}
                          className={cn(
                            'group flex w-full items-center gap-2 rounded-md px-3 py-1 text-left transition-colors hover:bg-accent',
                            (loadingChatId === item._id ||
                              deletingChatId === item._id) &&
                              'opacity-70',
                          )}
                        >
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left"
                            onClick={() => onOpenRecentChat(item._id)}
                            disabled={
                              loadingChatId === item._id ||
                              deletingChatId === item._id
                            }
                          >
                            <p className="line-clamp-1 text-sm font-medium text-foreground">
                              {item.title || 'New chat'}
                            </p>
                          </button>

                          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              size="icon"
                              variant="ghost"
                              type="button"
                              className="h-7 w-7"
                              onClick={() => onStartRename(item)}
                              disabled={
                                loadingChatId === item._id ||
                                deletingChatId === item._id
                              }
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              type="button"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => onRequestDelete(item)}
                              disabled={
                                loadingChatId === item._id ||
                                deletingChatId === item._id
                              }
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </section>

      <section className="min-h-0 flex-1">
        <div ref={chatViewportRef} className="h-full w-full">
          <ScrollArea className="h-full w-full">
            <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-4">
              {messages.length === 0 && (
                <div className="flex min-h-[56vh] flex-col items-center justify-center gap-5 pt-8 text-center">
                  <LogoIcon className="themed-svg h-16 w-16" />
                  <h2 className="text-3xl font-semibold">
                    {/* something special */}
                    Ask me about your codebase.
                  </h2>
                </div>
              )}

              {messages.map((message) => {
                const isUser = message.role === 'user';
                const isStreaming = !isUser && !!message.streaming;
                const isEmpty = !message.content;
                return (
                  <div
                    key={message.id}
                    className={cn(
                      'flex w-full items-start gap-3',
                      isUser && 'justify-end',
                    )}
                  >
                    <div
                      className={cn(
                        isUser ? 'order-1 max-w-[85%]' : 'order-2 max-w-full',
                      )}
                    >
                      {isUser ? (
                        <div className="whitespace-pre-wrap font-medium rounded-lg bg-secondary px-3 py-1.5 text-[14.5px] leading-6 text-foreground shadow-sm">
                          {message.content}
                        </div>
                      ) : isEmpty && isStreaming ? (
                        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                          <Spinner className="h-4 w-4" />
                          Getting answer...
                        </div>
                      ) : (
                        <div className="docs-markdown text-sm font-medium">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </section>

      <section className="relative shrink-0">
        {!stickToBottom && messages.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Jump to latest message"
            className="absolute left-1/2 -top-11.5 z-20 h-9 w-9 -translate-x-1/2 rounded-md border-border/70 bg-background/90 shadow-sm backdrop-blur"
            onClick={() => {
              setStickToBottom(true);
              scrollToBottom('smooth');
            }}
          >
            <ArrowDown className="size-4" />
          </Button>
        ) : null}
        <div className="mx-auto w-full max-w-200 px-4 pb-4">
          <form onSubmit={onSubmit} className="mx-auto w-full">
            <div className="bg-secondary/70 flex w-full flex-col items-end rounded-2xl border-2 border-border/80 shadow-sm backdrop-blur transition-all focus-within:border-border">
              <textarea
                ref={inputRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="Ask me about your codebase..."
                disabled={loading}
                maxLength={2000}
                rows={1}
                style={{ minHeight: '20px' }}
                className="flex w-full resize-none rounded-2xl border-0 bg-transparent p-4 pb-2 text-[14.5px] font-semibold shadow-none outline-none placeholder:text-muted-foreground focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <div className="flex w-full items-end justify-between px-3 pb-3 pl-4">
                <div className="flex justify-center">
                  <p className="text-xs text-muted-foreground/60">
                    {error ? (
                      <span className="text-destructive">{error}</span>
                    ) : (
                      'Press Enter to send, Shift+Enter for a new line.'
                    )}
                  </p>
                </div>
                <Button
                  type="submit"
                  size="icon"
                  disabled={loading || !question.trim()}
                >
                  {loading ? (
                    <Spinner className="size-5" />
                  ) : (
                    <ArrowUp className="size-4.5" />
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* ── Rename Chat Dialog ── */}
      <Dialog
        open={!!editingChatId}
        onOpenChange={(open) => {
          if (!open) onCancelRename();
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Chat</DialogTitle>
            <DialogDescription>
              Enter a new title for this chat.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            placeholder="Chat title"
            disabled={renaming}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onSaveRename();
              }
            }}
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={onCancelRename}
              disabled={renaming}
            >
              Cancel
            </Button>
            <Button
              onClick={onSaveRename}
              disabled={renaming || !editingTitle.trim()}
            >
              {renaming ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Chat Confirmation Dialog ── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Chat</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the chat? <br />
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteTargetChat(null);
              }}
              disabled={!!deletingChatId}
            >
              Cancel
            </Button>
            <Button
              variant="destructiveoutline"
              onClick={onConfirmDelete}
              disabled={!!deletingChatId}
            >
              {deletingChatId ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
