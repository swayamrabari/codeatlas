import { useState } from 'react';
import { useChatStore } from '@/store/chatStore';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface ChatHistoryProps {
  onClose?: () => void;
}

export default function ChatHistory({ onClose }: ChatHistoryProps) {
  const { sessions, currentSessionId, setCurrentSession, deleteSession } =
    useChatStore();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleSelectChat = (sessionId: string) => {
    setCurrentSession(sessionId);
    onClose?.();
  };

  // Hide sessions with zero messages (avoid showing empty "New Chat")
  const nonEmptySessions = sessions.filter((s) => s.messages.length > 0);

  const handleDeleteChat = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setPendingDeleteId(sessionId);
    setConfirmOpen(true);
  };

  if (nonEmptySessions.length === 0) {
    return (
      <div className="p-4 text-center text-sm font-semibold text-muted-foreground">
        No chat history yet
      </div>
    );
  }

  return (
    <div className="w-full max-h-[400px] overflow-y-auto">
      <div className="space-y-1 p-2">
        {nonEmptySessions.map((session) => (
          <div
            key={session.id}
            className={cn(
              'group relative flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors cursor-pointer',
              currentSessionId === session.id
                ? 'bg-primary/10 font-medium'
                : 'hover:bg-accent'
            )}
            onClick={() => handleSelectChat(session.id)}
          >
            <span className="flex-1 truncate text-left">{session.title}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-4 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              onClick={(e) => handleDeleteChat(e, session.id)}
            >
              <Trash2 className="text-expense" />
            </Button>
          </div>
        ))}
      </div>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Chat</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this chat? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (pendingDeleteId) {
                  await deleteSession(pendingDeleteId);
                }
                setConfirmOpen(false);
                setPendingDeleteId(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
