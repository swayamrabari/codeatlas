import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, Check, History, Pencil, Plus, Trash2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { projectAPI } from '../services/api';
import LogoIcon from '@/assets/logo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
    }));
}

export default function Ask({ projectId }) {
  const [messages, setMessages] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [currentChatTitle, setCurrentChatTitle] = useState('New chat');

  const [recentChats, setRecentChats] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentError, setRecentError] = useState('');
  const [loadingChatId, setLoadingChatId] = useState('');
  const [deletingChatId, setDeletingChatId] = useState('');

  const [editingChatId, setEditingChatId] = useState('');
  const [editingTitle, setEditingTitle] = useState('');
  const [renaming, setRenaming] = useState(false);

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetChat, setDeleteTargetChat] = useState(null);

  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recentOpen, setRecentOpen] = useState(false);

  const inputRef = useRef(null);
  const chatViewportRef = useRef(null);

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

  const upsertRecentChat = useCallback((chat) => {
    if (!chat?._id) return;

    setRecentChats((prev) => {
      const withoutCurrent = prev.filter((item) => item._id !== chat._id);
      return [chat, ...withoutCurrent]
        .sort(
          (a, b) =>
            new Date(b.lastMessageAt || b.updatedAt || 0).getTime() -
            new Date(a.lastMessageAt || a.updatedAt || 0).getTime(),
        )
        .slice(0, 60);
    });
  }, []);

  const loadRecentChats = useCallback(async () => {
    setRecentError('');
    setRecentLoading(true);
    try {
      const response = await projectAPI.listProjectChats(projectId);
      const chats = Array.isArray(response?.data) ? response.data : [];
      setRecentChats(chats);
    } catch (err) {
      const apiError = err?.response?.data?.error;
      setRecentError(apiError || 'Failed to load recent chats.');
    } finally {
      setRecentLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    setMessages([]);
    setCurrentChatId(null);
    setCurrentChatTitle('New chat');
    loadRecentChats();
  }, [loadRecentChats]);

  useEffect(() => {
    const viewport = chatViewportRef.current?.querySelector(
      '[data-slot="scroll-area-viewport"]',
    );
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const submitQuestion = async (value) => {
    const trimmed = value.trim();
    if (!trimmed || loading) return;

    setError('');
    setQuestion('');

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
      { id: assistantMsgId, role: 'assistant', content: '', citations: [] },
    ]);

    setLoading(true);

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
            // Append token to the assistant message
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? { ...msg, content: msg.content + data.text }
                  : msg,
              ),
            );
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
    });
  };

  const onOpenRecentChat = async (chatId) => {
    if (!chatId || loadingChatId || renaming) return;

    setLoadingChatId(chatId);
    setError('');
    try {
      const response = await projectAPI.getProjectChat(projectId, chatId);
      const chat = response?.data?.data || response?.data;
      if (!chat?._id) return;

      setCurrentChatId(chat._id);
      setCurrentChatTitle(chat.title || 'New chat');
      setMessages(mapStoredMessages(chat.messages));
      setQuestion('');
      setRecentOpen(false);
      upsertRecentChat(chat);
    } catch (err) {
      const apiError = err?.response?.data?.error;
      setError(apiError || 'Failed to load chat. Please try again.');
    } finally {
      setLoadingChatId('');
    }
  };

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

      setRecentChats((prev) => prev.filter((item) => item._id !== chatId));

      if (editingChatId === chatId) {
        onCancelRename();
      }

      if (currentChatId === chatId) {
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
                const isStreaming =
                  loading &&
                  !isUser &&
                  message === messages[messages.length - 1];
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
                          Thinking with your codebase context...
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

      <section className="shrink-0">
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
