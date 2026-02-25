import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUp, History, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import logo from '@/assets/trackit.svg';
import {
  sendMessage,
  executeFunctionCall,
  AssistantResponse,
} from '@/api/assistant';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { motion } from 'framer-motion';
import ChatHistory from '@/components/ChatHistory';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

function TypingDots() {
  return (
    <div className="flex -mt-1.5 items-center gap-1 px-3 py-3.5 bg-secondary rounded-full">
      <span className="w-2 h-2 bg-primary/70 rounded-full animate-bounce [animation-delay:-0.3s]" />
      <span className="w-2 h-2 bg-primary/70 rounded-full animate-bounce [animation-delay:-0.15s]" />
      <span className="w-2 h-2 bg-primary/70 rounded-full animate-bounce" />
    </div>
  );
}

function MessageContent({
  content,
  isUser,
  messageId,
  shouldAnimate,
  onAnimationStart,
  onAnimationEnd,
}: {
  content: string;
  isUser: boolean;
  messageId: string;
  shouldAnimate: boolean;
  onAnimationStart?: (id: string) => void;
  onAnimationEnd?: (id: string) => void;
}) {
  const [displayedText, setDisplayedText] = useState('');
  const animationStartedRef = useRef(false);
  const prevContentRef = useRef('');

  useEffect(() => {
    // For user messages, show immediately
    if (isUser) {
      setDisplayedText(content);
      return;
    }

    // If we shouldn't animate (historical messages), show immediately
    if (!shouldAnimate) {
      setDisplayedText(content);
      return;
    }

    // Reset animation flag if content changed
    if (prevContentRef.current !== content) {
      animationStartedRef.current = false;
      prevContentRef.current = content;
    }

    // Clean the content FIRST before splitting into words
    const cleanedContent = content.replace(/\s*undefined\s*$/gi, '').trim();

    // For assistant messages, show with word-by-word animation
    const words = cleanedContent.split(' ').filter((word) => word.length > 0);

    // Guard against empty content
    if (words.length === 0) {
      setDisplayedText('');
      return;
    }

    // Start animation only once per content
    if (!animationStartedRef.current) {
      animationStartedRef.current = true;
      onAnimationStart?.(messageId);
    }

    // Start fresh - set to first word
    setDisplayedText(words[0]);

    // If there's only one word, we're done
    if (words.length === 1) {
      setTimeout(() => onAnimationEnd?.(messageId), 100);
      return;
    }

    // Animate the rest of the words
    let currentIndex = 1;
    const interval = setInterval(() => {
      if (currentIndex < words.length) {
        const nextWord = words[currentIndex];
        setDisplayedText((prev) => `${prev} ${nextWord}`);
        currentIndex++;
      } else {
        clearInterval(interval);
        setTimeout(() => onAnimationEnd?.(messageId), 100);
      }
    }, 20);

    return () => {
      clearInterval(interval);
    };
  }, [
    content,
    isUser,
    messageId,
    shouldAnimate,
    onAnimationStart,
    onAnimationEnd,
  ]);

  if (isUser) return <>{content}</>;

  // Clean the displayed text before parsing
  const cleanedText = displayedText.replace(/\s*undefined\s*$/gi, '').trim();

  // Parse markdown to HTML (marked.parse is synchronous)
  const htmlContent = marked.parse(cleanedText) || '';

  // Ensure we have a string and sanitize it
  const cleanHTML = DOMPurify.sanitize(String(htmlContent));

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="prose prose-sm text-base text-foreground font-medium dark:prose-invert max-w-none
        prose-p:prose-p:leading-relaxed
        prose-ul:my-2 prose-ul:pl-5 prose-ul:list-disc
        prose-ol:my-2 prose-ol:pl-5 prose-ol:list-decimal
        prose-li:my-1 prose-li:marker:text-primary
        prose-strong:text-foreground prose-strong:font-semibold
        prose-h1:text-lg prose-h1:font-bold prose-h1:my-2
        prose-h2:text-base prose-h2:font-bold prose-h2:my-2
        prose-h3:text-sm prose-h3:font-semibold prose-h3:my-1
        prose-blockquote:border-l-2 prose-blockquote:border-primary prose-blockquote:pl-3
        prose-code:bg-secondary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
        prose-a:text-primary prose-a:underline"
      dangerouslySetInnerHTML={{ __html: cleanHTML }}
    />
  );
}

export default function Assistant() {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [animatedMessages, setAnimatedMessages] = useState<Set<string>>(
    new Set()
  );
  const endRef = useRef<HTMLDivElement | null>(null);
  const { user, isAuthenticated } = useAuthStore();
  const username = user?.name || 'User';

  const {
    currentSessionId,
    getCurrentSession,
    createNewSession,
    addMessage,
    updateMessage,
    removeMessage,
    loadSessionsFromDatabase,
    setCurrentSession,
  } = useChatStore();

  // Load sessions from database when authenticated, then initialize session
  useEffect(() => {
    const initializeSession = async () => {
      if (isAuthenticated) {
        await loadSessionsFromDatabase();
        // Small delay to ensure state is updated
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // Check state and create/set session if needed
      const state = useChatStore.getState();
      if (!state.currentSessionId) {
        if (state.sessions.length === 0) {
          // No sessions exist, create a new empty one
          await createNewSession();
        } else {
          // Find an empty session first, or create one if none exists
          const emptySession = state.sessions.find(
            (s) => s.messages.length === 0
          );
          if (emptySession) {
            setCurrentSession(emptySession.id);
          } else {
            // No empty session, create a new one
            await createNewSession();
          }
        }
      } else {
        // Current session exists, verify it's still valid
        const currentSession = state.sessions.find(
          (s) => s.id === state.currentSessionId
        );
        if (!currentSession) {
          // Current session was deleted, find empty or create new
          const emptySession = state.sessions.find(
            (s) => s.messages.length === 0
          );
          if (emptySession) {
            setCurrentSession(emptySession.id);
          } else {
            await createNewSession();
          }
        }
      }
    };

    initializeSession();
  }, [
    isAuthenticated,
    loadSessionsFromDatabase,
    createNewSession,
    setCurrentSession,
  ]);

  const currentSession = getCurrentSession();
  const messages = currentSession?.messages || [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Track when session changes to reset animation tracking for historical messages
  useEffect(() => {
    // When switching to a different session, mark all existing messages as already animated
    const state = useChatStore.getState();
    const session = state.sessions.find((s) => s.id === state.currentSessionId);
    const existingMessageIds = (session?.messages || [])
      .filter((m) => m.content && m.content.trim().length > 0)
      .map((m) => m.id);

    setAnimatedMessages(new Set(existingMessageIds));
  }, [currentSessionId]);

  const handleAnimationStart = useCallback((_messageId: string) => {
    // Animation tracking (can be used for future enhancements)
  }, []);

  const handleAnimationEnd = useCallback((messageId: string) => {
    setAnimatedMessages((prev) => new Set(prev).add(messageId));
  }, []);

  // Helper function to get current date and time context
  const getDateTimeContext = () => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    };
    return `Current date and time: ${now.toLocaleDateString('en-US', options)}`;
  };

  const fadeInResponse = (html: string, msgId: string) => {
    const sessionId = currentSessionId;
    if (!sessionId) {
      return;
    }
    updateMessage(sessionId, msgId, html);
  };

  const handleNewChat = async () => {
    await createNewSession();
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    // Ensure we have a valid session
    let sessionId = currentSessionId;
    let session = getCurrentSession();

    // If no session ID or session doesn't exist, create a new session
    if (!sessionId || !session) {
      sessionId = await createNewSession();
      if (!sessionId || !getCurrentSession()) {
        return;
      }
      session = getCurrentSession();
    }

    // If the current session has messages and user wants to start fresh,
    // they should use "New Chat" button. Otherwise, use the current session.
    // For empty sessions, always use them (don't create new)

    const userMsgId = crypto.randomUUID();
    await addMessage(sessionId, {
      id: userMsgId,
      role: 'user',
      content: trimmed,
    });
    setInput('');

    const assistantMsgId = crypto.randomUUID();
    setIsTyping(true);
    await addMessage(sessionId, {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
    });

    try {
      await handleAssistantResponse(trimmed, assistantMsgId);
    } catch (error) {
      fadeInResponse('There was an error. Please try again.', assistantMsgId);
    } finally {
      setIsTyping(false);
    }
  };

  const handleAssistantResponse = async (
    message: string,
    assistantMsgId: string,
    functionResults?: Array<{
      functionName: string;
      parameters: Record<string, any>;
      result: any;
    }>
  ) => {
    const sessionId = currentSessionId;
    if (!sessionId) {
      return;
    }

    try {
      // Get conversation history (exclude thinking messages and the current assistant message being created)
      const conversationHistory = messages
        .filter(
          (msg) =>
            msg.id !== assistantMsgId &&
            msg.role !== 'thinking' &&
            (msg.role === 'user' || msg.role === 'assistant')
        )
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

      // Add date/time context to the first message only (not on function result follow-ups)
      const messageWithContext = !functionResults
        ? `${getDateTimeContext()}\n\nUser query: ${message}`
        : message;

      const data: AssistantResponse = await sendMessage(
        messageWithContext,
        functionResults,
        conversationHistory
      );

      // Check for errors first
      if (data.error) {
        fadeInResponse(data.error, assistantMsgId);
        return;
      }

      if (
        data.type === 'function_call' &&
        data.functionName &&
        data.parameters
      ) {
        // Show thinking message with simple animation
        const thinkingMsgId = crypto.randomUUID();
        await addMessage(sessionId, {
          id: thinkingMsgId,
          role: 'thinking',
          content: '', // Empty content - just show the animated dots
        });

        const functionResult = await executeFunctionCall(
          data.functionName,
          data.parameters
        );

        // Remove thinking message
        await removeMessage(sessionId, thinkingMsgId);

        // Always send function result to assistant, even if it failed
        // This allows the assistant to provide a helpful error message to the user
        const functionResultsArray = [
          {
            functionName: data.functionName,
            parameters: data.parameters,
            result: functionResult,
          },
        ];
        await handleAssistantResponse(
          message,
          assistantMsgId,
          functionResultsArray
        );
      } else if (data.type === 'text' && data.response) {
        // Clean the response and remove any "undefined" strings
        const cleanedResponse = String(data.response)
          .replace(/\s*undefined\s*$/gi, '')
          .trim();

        const sanitizedResponse = DOMPurify.sanitize(cleanedResponse);

        fadeInResponse(sanitizedResponse, assistantMsgId);
      } else if (data.error) {
        fadeInResponse(data.error, assistantMsgId);
      } else {
        fadeInResponse(
          'Sorry, I could not generate a response.',
          assistantMsgId
        );
      }
    } catch (error) {
      console.error('Error in handleAssistantResponse:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'There was an error processing your request. Please check the console for more details.';
      fadeInResponse(errorMessage, assistantMsgId);
    }
  };

  const quickPrompts = [
    'What was my total expense last month?',
    'On what did I spend the most this week?',
    'How much budget is left for groceries?',
  ];

  return (
    <div className="w-full h-full md:h-svh flex flex-col relative md:static">
      {/* Fixed Header - Mobile Only */}
      <div className="w-full flex items-center justify-between py-5 md:pt-10 sticky top-0 left-0 right-0 z-30 bg-background md:relative md:top-auto md:left-auto md:right-auto md:z-auto md:px-0">
        <div className="head">
          <h1 className="title text-[27px] md:text-3xl font-bold">
            TrackIt AI
          </h1>
          <p className="hidden md:block text-sm md:text-base text-muted-foreground font-semibold">
            Your personal assistant for TrackIt.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Popover open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="secondary"
                className="gap-2 w-10 sm:w-fit font-semibold"
              >
                <History className="stroke-[2.5px]" />
                <span className="hidden sm:inline">History</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-80 p-0 rounded-xl border-2"
              align="end"
            >
              <div className="border-b px-4 py-3">
                <h3 className="font-semibold text-lg">Chat History</h3>
                <p className="text-sm text-muted-foreground font-semibold">
                  View and manage chats
                </p>
              </div>
              <ChatHistory onClose={() => setIsHistoryOpen(false)} />
            </PopoverContent>
          </Popover>

          <Button
            onClick={handleNewChat}
            variant={'secondary'}
            className="gap-2 w-10 sm:w-fit font-semibold"
          >
            <Plus className="stroke-[2.5px]" />
            <span className="hidden sm:block">New Chat</span>
          </Button>
        </div>
      </div>

      {/* Scrollable Content Area - Mobile Only */}
      <div className="flex-1 page overflow-y-auto w-full max-w-[700px] mx-auto px-1 pt-5 pb-32 md:pt-4 md:pb-4 md:py-6">
        {messages.length === 0 ? (
          <div className="flex flex-col h-full items-center justify-center gap-4 md:gap-6">
            <img src={logo} alt="TrackIt Logo" className="w-16 opacity-90" />
            <div className="text-center text-muted-foreground max-w-md px-2">
              <p className="text-xl md:text-2xl font-semibold">
                How can I assist,{' '}
                {username.split(' ')[0].charAt(0).toUpperCase() +
                  username.split(' ')[0].slice(1)}
                ?
              </p>
            </div>

            <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 w-full max-w-3xl px-2 md:px-0">
              {quickPrompts.map((question, index) => (
                <div
                  key={index}
                  className="bg-secondary cursor-pointer rounded-xl px-3 md:px-4 py-3 md:py-3.5 text-sm transition-colors hover:bg-secondary/80"
                  onClick={() => setInput(question)}
                >
                  <p className="font-medium text-primary/70 text-balance">
                    {question}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((m, index) => {
              const isUser = m.role === 'user';
              const shouldAnimate = !animatedMessages.has(m.id) && !isUser;

              return (
                <div
                  key={m.id}
                  className={`flex w-full gap-3 items-start ${
                    isUser ? 'justify-end' : 'justify-start'
                  } ${index !== 0 && isUser ? 'mt-10' : ''}`}
                >
                  {/* Show avatar based on message role */}
                  {!isUser && (
                    <div className="h-9 w-9 hidden md:flex flex-shrink-0 rounded-full bg-primary/10 items-center justify-center">
                      <img src={logo} alt="TrackIt" className="w-5 h-5" />
                    </div>
                  )}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`max-w-[85%] md:max-w-[70%] rounded-xl text-base font-medium md:text-base px-3 py-[7px] leading-6 ${
                      isUser
                        ? 'bg-secondary text-secondary-foreground'
                        : '!px-0 py-0.5'
                    }`}
                  >
                    {m.content ? (
                      <MessageContent
                        content={m.content}
                        isUser={isUser}
                        messageId={m.id}
                        shouldAnimate={shouldAnimate}
                        onAnimationStart={handleAnimationStart}
                        onAnimationEnd={handleAnimationEnd}
                      />
                    ) : isTyping && !isUser ? (
                      <TypingDots />
                    ) : null}
                  </motion.div>
                  {/* Show user avatar on the right */}
                  {isUser && (
                    <div className="h-9 w-9 hidden md:flex flex-shrink-0 rounded-full bg-foreground text-secondary text-base items-center justify-center font-bold">
                      {username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* Fixed Input - Mobile Only */}
      <div className="w-full md:max-w-[700px] sticky bottom-0 md:mx-auto bg-background pb-4 pt-4 md:pb-8 md:pt-0 md:px-0">
        <div className="textarea-container h-fit w-full relative">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <Input
              className="w-full h-12 font-medium border-2 focus:border-primary/5 border-primary/5 focus:ring-0 p-7 px-6 bg-secondary rounded-full shadow-sm"
              placeholder="Ask me about your trackings"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <Button
              className="absolute bg-primary h-10 w-10 rounded-full right-2.5 top-1/2 -translate-y-1/2"
              disabled={!input.trim() || isTyping}
              type="submit"
            >
              <ArrowUp className="!h-6 !w-6" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
