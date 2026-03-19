import { useMemo, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { projectAPI } from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';

const STARTER_QUESTIONS = [
  'Explain the project architecture in simple terms.',
  'Which files handle authentication and authorization?',
  'Where is documentation generation triggered from?',
  'How are embeddings generated and stored?',
];

export default function Ask({ projectId }) {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);

  const history = useMemo(
    () =>
      messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: m.content }))
        .slice(-8),
    [messages],
  );

  const submitQuestion = async (value) => {
    const trimmed = value.trim();
    if (!trimmed || loading) return;

    setError('');
    setQuestion('');

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmed,
      },
    ]);

    setLoading(true);

    try {
      const response = await projectAPI.askProjectQuestion(
        projectId,
        trimmed,
        history,
      );

      const payload = response?.data || {};

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content:
            payload.answer ||
            'I could not generate an answer from the available context.',
          citations: payload.citations || [],
        },
      ]);
    } catch (err) {
      const apiError = err?.response?.data?.error;
      setError(apiError || 'Failed to get answer. Please try again.');
    } finally {
      setLoading(false);
      requestAnimationFrame(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      });
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    await submitQuestion(question);
  };

  return (
    <div className="h-full min-h-0 flex flex-col bg-background">
      <div className="border-b px-4 py-3">
        <h1 className="text-lg font-semibold text-foreground">Ask</h1>
        <p className="text-sm text-muted-foreground">
          Ask questions grounded in your project embeddings.
        </p>
      </div>

      <div className="flex-1 min-h-0 p-4">
        <div className="h-full rounded-xl border bg-card overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 space-y-4">
              {messages.length === 0 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Try one of these to get started:
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {STARTER_QUESTIONS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className="text-left text-sm rounded-md border border-border px-3 py-2 hover:bg-accent transition-colors"
                        onClick={() => submitQuestion(item)}
                        disabled={loading}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`rounded-xl border px-4 py-3 max-w-4xl ${
                    message.role === 'user'
                      ? 'ml-auto bg-primary/5 border-primary/20'
                      : 'bg-muted/30'
                  }`}
                >
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                    {message.role === 'user' ? 'You' : 'Assistant'}
                  </p>
                  <p className="text-sm whitespace-pre-wrap text-foreground">
                    {message.content}
                  </p>

                  {message.role === 'assistant' &&
                    Array.isArray(message.citations) &&
                    message.citations.length > 0 && (
                      <div className="mt-3 border-t pt-3 space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Sources
                        </p>
                        {message.citations.map((c, idx) => {
                          const lineRange =
                            c.lineStart && c.lineEnd
                              ? `:${c.lineStart}-${c.lineEnd}`
                              : '';
                          const score =
                            typeof c.score === 'number'
                              ? ` (${Math.round(c.score * 100)}%)`
                              : '';

                          const label = c.path
                            ? c.path
                            : c.featureName
                              ? `Feature: ${c.featureName}`
                              : 'project docs';

                          return (
                            <p
                              key={`${message.id}-${idx}`}
                              className="text-xs text-muted-foreground"
                            >
                              {label}
                              {lineRange} [{c.chunkType}]{score}
                            </p>
                          );
                        })}
                      </div>
                    )}
                </div>
              ))}

              {loading && (
                <div className="rounded-xl border px-4 py-3 bg-muted/30 inline-flex items-center gap-2">
                  <Spinner className="h-4 w-4" />
                  <p className="text-sm text-muted-foreground">
                    Thinking with your codebase context...
                  </p>
                </div>
              )}

              <div ref={endRef} />
            </div>
          </ScrollArea>

          <form onSubmit={onSubmit} className="border-t p-3 space-y-2">
            <div className="flex gap-2">
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask about architecture, files, flows, or implementation details..."
                disabled={loading}
                maxLength={2000}
              />
              <Button
                type="submit"
                disabled={loading || !question.trim()}
                className="shrink-0"
              >
                {loading ? <Spinner className="h-4 w-4" /> : <Send size={16} />}
                Ask
              </Button>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}
