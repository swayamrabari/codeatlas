import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { chatApi, ChatSession as ApiChatSession } from '@/api/chat';
import { useAuthStore } from './authStore';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'thinking';
  content: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  _id?: string; // Database ID
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessage[];
}

interface ChatStore {
  sessions: ChatSession[];
  currentSessionId: string | null;
  isLoading: boolean;
  isSyncing: boolean;

  // Session management
  createNewSession: () => Promise<string>;
  deleteSession: (sessionId: string) => Promise<void>;
  setCurrentSession: (sessionId: string) => void;
  updateSessionTitle: (sessionId: string, title: string) => Promise<void>;
  getSortedSessions: () => ChatSession[];
  loadSessionsFromDatabase: () => Promise<void>;
  syncSessionToDatabase: (sessionId: string) => Promise<void>;

  // Message management
  addMessage: (
    sessionId: string,
    message: Omit<ChatMessage, 'timestamp'>
  ) => Promise<void>;
  updateMessage: (
    sessionId: string,
    messageId: string,
    content: string
  ) => Promise<void>;
  removeMessage: (sessionId: string, messageId: string) => Promise<void>;

  // Getters
  getCurrentSession: () => ChatSession | null;
  getSessionById: (sessionId: string) => ChatSession | null;
  getSessionMessages: (sessionId: string) => ChatMessage[];
}

// Helper to convert API session to store session
const convertApiSessionToStore = (apiSession: ApiChatSession): ChatSession => {
  return {
    id: apiSession._id || apiSession.id || '',
    _id: apiSession._id,
    title: apiSession.title,
    createdAt: new Date(apiSession.createdAt || Date.now()),
    updatedAt: new Date(apiSession.updatedAt || Date.now()),
    messages: apiSession.messages.map((msg) => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    })),
  };
};

// Helper to convert store session to API format
const convertStoreSessionToApi = (session: ChatSession): ApiChatSession => {
  return {
    _id: session._id,
    id: session.id,
    title: session.title,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    messages: session.messages.map((msg) => ({
      ...msg,
      timestamp:
        msg.timestamp instanceof Date
          ? msg.timestamp.toISOString()
          : msg.timestamp,
    })),
  };
};

// Debounce helper to prevent concurrent syncs
const syncTimeouts = new Map<string, NodeJS.Timeout>();

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: null,
      isLoading: false,
      isSyncing: false,

      loadSessionsFromDatabase: async () => {
        const { isAuthenticated } = useAuthStore.getState();
        if (!isAuthenticated) return;

        try {
          set({ isLoading: true });
          const apiSessions = await chatApi.getSessions();
          const storeSessions = apiSessions.map(convertApiSessionToStore);
          set({ sessions: storeSessions, isLoading: false });
        } catch {
          set({ isLoading: false });
        }
      },

      syncSessionToDatabase: async (sessionId: string) => {
        const { isAuthenticated } = useAuthStore.getState();
        if (!isAuthenticated) return;

        // Clear existing timeout for this session to debounce rapid updates
        if (syncTimeouts.has(sessionId)) {
          clearTimeout(syncTimeouts.get(sessionId)!);
        }

        // Debounce: wait 500ms before syncing to prevent concurrent updates
        syncTimeouts.set(sessionId, setTimeout(async () => {
          const state = get();
          const session = state.sessions.find((s) => s.id === sessionId);
          if (!session) {
            syncTimeouts.delete(sessionId);
            return;
          }

          try {
            set({ isSyncing: true });
            const apiSession = convertStoreSessionToApi(session);

            if (session._id) {
              // Update existing session
              await chatApi.updateSession(session._id, {
                title: apiSession.title,
                messages: apiSession.messages,
              });
            } else {
              // Create new session in database
              const created = await chatApi.createSession(apiSession.title);
              const createdStoreSession = convertApiSessionToStore(created);

              // Update local session with database ID and replace
              set((state) => ({
                sessions: state.sessions.map((s) =>
                  s.id === sessionId
                    ? {
                        ...s,
                        _id: createdStoreSession._id,
                        id: createdStoreSession.id,
                      }
                    : s
                ),
              }));
            }
            set({ isSyncing: false });
          } catch {
            set({ isSyncing: false });
          } finally {
            syncTimeouts.delete(sessionId);
          }
        }, 500)); // 500ms debounce to prevent version conflicts
      },

      createNewSession: async () => {
        const now = new Date();
        const { isAuthenticated } = useAuthStore.getState();

        // If authenticated, create in database first
        if (isAuthenticated) {
          try {
            const created = await chatApi.createSession();
            const createdStoreSession = convertApiSessionToStore(created);

            set((state) => ({
              sessions: [createdStoreSession, ...state.sessions],
              currentSessionId: createdStoreSession.id,
            }));
            return createdStoreSession.id;
          } catch {
            // Fall through to create local session if DB creation fails
          }
        }

        // Create local session (for unauthenticated users or if DB creation failed)
        const newSessionId = crypto.randomUUID();
        const newSession: ChatSession = {
          id: newSessionId,
          title: 'New Chat',
          createdAt: now,
          updatedAt: now,
          messages: [],
        };

        set((state) => ({
          sessions: [newSession, ...state.sessions],
          currentSessionId: newSessionId,
        }));

        return newSessionId;
      },

      deleteSession: async (sessionId: string) => {
        const state = get();
        const session = state.sessions.find((s) => s.id === sessionId);
        const { isAuthenticated } = useAuthStore.getState();

        // Delete from database if authenticated
        if (isAuthenticated && session?._id) {
          try {
            await chatApi.deleteSession(session._id);
          } catch {
            // Error deleting session - continue with local deletion
          }
        }

        set((state) => {
          const newSessions = state.sessions.filter((s) => s.id !== sessionId);
          const wasLastSession = newSessions.length === 0;
          const wasCurrentSession = state.currentSessionId === sessionId;

          let newCurrentId = wasCurrentSession
            ? newSessions[0]?.id || null
            : state.currentSessionId;

          // If this was the last session, create a new empty one
          if (wasLastSession) {
            const now = new Date();
            const newSession: ChatSession = {
              id: crypto.randomUUID(),
              title: 'New Chat',
              createdAt: now,
              updatedAt: now,
              messages: [],
            };

            // If authenticated, create in database
            if (isAuthenticated) {
              // Create new session async but don't await - update state immediately
              chatApi.createSession().then((created) => {
                const createdStoreSession = convertApiSessionToStore(created);
                set((state) => ({
                  sessions: state.sessions.map((s) =>
                    s.id === newSession.id
                      ? { ...s, ...createdStoreSession }
                      : s
                  ),
                  currentSessionId: createdStoreSession.id,
                }));
              }).catch(() => {
                // Error creating new session - user can manually create one
              });
            }

            newSessions.push(newSession);
            newCurrentId = newSession.id;
          }

          return {
            sessions: newSessions,
            currentSessionId: newCurrentId,
          };
        });
      },

      setCurrentSession: (sessionId: string) => {
        set({ currentSessionId: sessionId });
      },

      updateSessionTitle: async (sessionId: string, title: string) => {
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId
              ? { ...session, title, updatedAt: new Date() }
              : session
          ),
        }));

        // Sync to database
        const { isAuthenticated } = useAuthStore.getState();
        if (isAuthenticated) {
          get().syncSessionToDatabase(sessionId);
        }
      },

      getSortedSessions: () => {
        const state = get();
        return [...state.sessions].sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      },

      addMessage: async (
        sessionId: string,
        message: Omit<ChatMessage, 'timestamp'>
      ) => {
        const now = new Date();
        const newMessage: ChatMessage = {
          ...message,
          timestamp: now,
        };

        set((state) => {
          return {
            sessions: state.sessions.map((session) => {
              if (session.id === sessionId) {
                const updatedMessages = [...session.messages, newMessage];

                // Auto-generate title from first user message
                let title = session.title;
                if (
                  title === 'New Chat' &&
                  message.role === 'user' &&
                  updatedMessages.length === 1
                ) {
                  title =
                    message.content.slice(0, 50) +
                    (message.content.length > 50 ? '...' : '');
                }

                return {
                  ...session,
                  messages: updatedMessages,
                  updatedAt: now,
                  title,
                };
              }
              return session;
            }),
          };
        });

        // Sync to database (handled by debouncing in syncSessionToDatabase)
        const { isAuthenticated } = useAuthStore.getState();
        if (isAuthenticated) {
          // The syncSessionToDatabase function now handles debouncing internally
          get().syncSessionToDatabase(sessionId);
        }
      },

      updateMessage: async (
        sessionId: string,
        messageId: string,
        content: string
      ) => {
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId
              ? {
                  ...session,
                  messages: session.messages.map((msg) =>
                    msg.id === messageId ? { ...msg, content } : msg
                  ),
                  updatedAt: new Date(),
                }
              : session
          ),
        }));

        // Sync to database (handled by debouncing in syncSessionToDatabase)
        const { isAuthenticated } = useAuthStore.getState();
        if (isAuthenticated) {
          get().syncSessionToDatabase(sessionId);
        }
      },

      removeMessage: async (sessionId: string, messageId: string) => {
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId
              ? {
                  ...session,
                  messages: session.messages.filter(
                    (msg) => msg.id !== messageId
                  ),
                  updatedAt: new Date(),
                }
              : session
          ),
        }));

        // Sync to database (handled by debouncing in syncSessionToDatabase)
        const { isAuthenticated } = useAuthStore.getState();
        if (isAuthenticated) {
          get().syncSessionToDatabase(sessionId);
        }
      },

      getCurrentSession: (): ChatSession | null => {
        const state = get();
        if (!state.currentSessionId) return null;
        return (
          state.sessions.find((s) => s.id === state.currentSessionId) || null
        );
      },

      getSessionById: (sessionId: string): ChatSession | null => {
        const state = get();
        return state.sessions.find((s) => s.id === sessionId) || null;
      },

      getSessionMessages: (sessionId: string): ChatMessage[] => {
        const state = get();
        const session = state.sessions.find((s) => s.id === sessionId);
        return session?.messages || [];
      },
    }),
    {
      name: 'chat-storage',
      partialize: (state) => ({
        sessions: state.sessions.map((session) => ({
          ...session,
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt),
          messages: session.messages.map((msg) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })),
        })),
        currentSessionId: state.currentSessionId,
      }),
    }
  )
);
