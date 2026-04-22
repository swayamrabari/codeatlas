import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Ban,
  BrainCircuit,
  FileText,
  FolderKanban,
  Mail,
  MessageCircleWarning,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserMinus,
  Users,
} from 'lucide-react';
import Header from '@/components/Header';
import { adminAPI } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function formatNumber(value) {
  if (typeof value !== 'number') return '0';
  return new Intl.NumberFormat().format(value);
}

function formatDateTime(iso) {
  if (!iso) return 'Not available';
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatCard({ label, value, helper, icon: Icon, accentClass = '' }) {
  return (
    <Card className="gap-4">
      <CardHeader className="pb-0">
        <CardDescription className="text-xs uppercase tracking-wide">
          {label}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-end justify-between gap-4">
        <div>
          <p className="text-3xl font-bold text-foreground leading-none">
            {formatNumber(value)}
          </p>
          <p className="text-xs text-muted-foreground mt-2">{helper}</p>
        </div>
        <div
          className={`h-11 w-11 rounded-xl flex items-center justify-center bg-secondary ${accentClass}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [actionState, setActionState] = useState({ type: '', message: '' });

  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyTarget, setNotifyTarget] = useState(null);
  const [notifySubject, setNotifySubject] = useState('');
  const [notifyMessage, setNotifyMessage] = useState('');

  const [blockOpen, setBlockOpen] = useState(false);
  const [blockTarget, setBlockTarget] = useState(null);
  const [blockReason, setBlockReason] = useState('');

  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['adminStats'],
    queryFn: () => adminAPI.getStats(),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const {
    data: usersData,
    isLoading: usersLoading,
    isError: usersError,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: () => adminAPI.getUsers(),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  const notifyMutation = useMutation({
    mutationFn: ({ userId, subject, message }) =>
      adminAPI.notifyUser(userId, subject, message),
    onSuccess: () => {
      setActionState({
        type: 'success',
        message: 'Notification sent successfully.',
      });
      setNotifyOpen(false);
      setNotifyTarget(null);
      setNotifySubject('');
      setNotifyMessage('');
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
    onError: (error) => {
      setActionState({
        type: 'error',
        message: error?.response?.data?.error || 'Failed to send notification.',
      });
    },
  });

  const blockMutation = useMutation({
    mutationFn: ({ userId, blocked, reason }) =>
      adminAPI.setUserBlocked(userId, blocked, reason),
    onSuccess: (_, variables) => {
      setActionState({
        type: 'success',
        message: variables.blocked
          ? 'User blocked successfully.'
          : 'User unblocked successfully.',
      });
      setBlockOpen(false);
      setBlockTarget(null);
      setBlockReason('');
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    },
    onError: (error) => {
      setActionState({
        type: 'error',
        message:
          error?.response?.data?.error || 'Failed to update user status.',
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (userId) => adminAPI.removeUser(userId),
    onSuccess: () => {
      setActionState({
        type: 'success',
        message: 'User removed successfully.',
      });
      setRemoveOpen(false);
      setRemoveTarget(null);
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    },
    onError: (error) => {
      setActionState({
        type: 'error',
        message: error?.response?.data?.error || 'Failed to remove user.',
      });
    },
  });

  const payload = data?.data;

  const overview = payload?.overview || {};
  const chats = payload?.chats || {};
  const projectStatusBreakdown = payload?.projectStatusBreakdown || [];
  const users = usersData?.data || [];
  const visibleUsers = users.filter((item) => !item.isAdmin);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="mx-auto max-w-7xl px-6 py-12 space-y-8">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Badge className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold tracking-wide text-muted-foreground">
              Admin Control Center
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
              Admin Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Monitor platform usage, manage users, and oversee project
              analytics
            </p>
            <p className="text-xs text-muted-foreground">
              Last updated: {formatDateTime(payload?.generatedAt)}
            </p>
          </div>

          <Button
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            {isFetching ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh Stats
          </Button>
        </section>

        {isLoading ? (
          <div className="h-[45vh] flex items-center justify-center">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Spinner className="h-5 w-5" />
              Loading admin analytics...
            </div>
          </div>
        ) : null}

        {isError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              Failed to load admin stats.
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : null}

        {!isLoading && !isError ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <StatCard
                label="Total Users"
                value={overview.totalUsers}
                helper={`${formatNumber(overview.verifiedUsers || 0)} verified`}
                icon={Users}
                accentClass="text-blue-500"
              />
              <StatCard
                label="Total Projects"
                value={overview.totalProjects}
                helper={`${formatNumber(overview.readyProjects || 0)} ready`}
                icon={FolderKanban}
                accentClass="text-emerald-500"
              />
              <StatCard
                label="Documents"
                value={overview.totalFiles}
                helper={`${formatNumber(overview.totalFeatures || 0)} detected features`}
                icon={FileText}
                accentClass="text-amber-500"
              />
              <StatCard
                label="Embeddings"
                value={overview.totalEmbeddings}
                helper="All vector chunks"
                icon={BrainCircuit}
                accentClass="text-fuchsia-500"
              />
              <StatCard
                label="Chat Requests"
                value={overview.totalChatRequests}
                helper={`${formatNumber(chats.totalChats || 0)} total chats`}
                icon={MessageSquareText}
                accentClass="text-cyan-500"
              />
              <StatCard
                label="Blocked Users"
                value={overview.blockedUsers}
                helper={`${formatNumber(overview.activeUsers || 0)} active users`}
                icon={UserMinus}
                accentClass="text-rose-500"
              />
            </section>

            <section>
              <Card className="gap-4">
                <CardHeader className="pb-0">
                  <CardTitle>Project Status Breakdown</CardTitle>
                  <CardDescription>
                    Current lifecycle status across all projects
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {projectStatusBreakdown.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No project status data available.
                    </p>
                  ) : (
                    projectStatusBreakdown.map((row) => (
                      <Badge
                        key={row.status}
                        variant="secondary"
                        className="px-2.5 py-1"
                      >
                        {row.status}: {formatNumber(row.count)}
                      </Badge>
                    ))
                  )}
                </CardContent>
              </Card>
            </section>

            <section>
              <div className="gap-4">
                <div className="pb-0 flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      User Management
                    </CardTitle>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchUsers()}
                    className="gap-2"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Refresh Users
                  </Button>
                </div>
                <div className="mt-4">
                  {actionState.message ? (
                    <div
                      className={`mb-4 rounded-xl border px-3 py-2 text-sm ${
                        actionState.type === 'error'
                          ? 'border-destructive/40 bg-destructive/10 text-destructive'
                          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                      }`}
                    >
                      {actionState.message}
                    </div>
                  ) : null}

                  {usersLoading ? (
                    <div className="py-8 flex items-center justify-center text-muted-foreground gap-2">
                      <Spinner className="h-4 w-4" />
                      Loading users...
                    </div>
                  ) : null}

                  {usersError ? (
                    <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2">
                      Failed to load users list.
                    </div>
                  ) : null}

                  {!usersLoading && !usersError ? (
                    <>
                      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-[11px]">
                          {formatNumber(visibleUsers.length)} users
                        </Badge>
                      </div>

                      {visibleUsers.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border bg-muted/10 px-4 py-10 text-center">
                          <p className="text-sm font-medium text-foreground">
                            No non-admin users found.
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            New member accounts will appear here.
                          </p>
                        </div>
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                          {visibleUsers.map((item) => {
                            const isSelf =
                              String(currentUser?._id) === String(item._id);
                            const canModerate = !isSelf;

                            return (
                              <div
                                key={item._id}
                                className="group flex h-full flex-col rounded-2xl border border-border/90 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                                      {String(item.name || '?')
                                        .trim()
                                        .charAt(0)
                                        .toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-semibold text-foreground truncate leading-tight">
                                        {item.name}
                                      </p>
                                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                                        {item.email}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                                    {!item.isVerified ? (
                                      <Badge variant="outline">
                                        Unverified
                                      </Badge>
                                    ) : null}
                                    {item.isBlocked ? (
                                      <Badge variant="destructive">
                                        Blocked
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary">Active</Badge>
                                    )}
                                  </div>
                                </div>

                                <div className="mt-4 grid gap-2 grid-cols-2">
                                  <div className="rounded-xl border border-border/80 bg-background/60 px-3 py-2">
                                    <p className="text-[11px] text-muted-foreground">
                                      Projects
                                    </p>
                                    <p className="text-sm font-semibold text-foreground">
                                      {formatNumber(item.projectsCount || 0)}
                                    </p>
                                  </div>
                                  <div className="rounded-xl border border-border/80 bg-background/60 px-3 py-2">
                                    <p className="text-[11px] text-muted-foreground">
                                      Files
                                    </p>
                                    <p className="text-sm font-semibold text-foreground">
                                      {formatNumber(item.filesCount || 0)}
                                    </p>
                                  </div>
                                  <div className="rounded-xl border border-border/80 bg-background/60 px-3 py-2">
                                    <p className="text-[11px] text-muted-foreground">
                                      Chats
                                    </p>
                                    <p className="text-sm font-semibold text-foreground">
                                      {formatNumber(item.chatsCount || 0)}
                                    </p>
                                  </div>
                                  <div className="rounded-xl border border-border/80 bg-background/60 px-3 py-2">
                                    <p className="text-[11px] text-muted-foreground">
                                      Requests
                                    </p>
                                    <p className="text-sm font-semibold text-foreground">
                                      {formatNumber(
                                        item.chatRequestsCount || 0,
                                      )}
                                    </p>
                                  </div>
                                </div>

                                {item.isBlocked && item.blockReason ? (
                                  <p className="mt-3 text-xs text-destructive/90">
                                    Block reason: {item.blockReason}
                                  </p>
                                ) : null}

                                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1.5"
                                    onClick={() => {
                                      setActionState({ type: '', message: '' });
                                      setNotifyTarget(item);
                                      setNotifySubject(
                                        'CodeAtlas account update',
                                      );
                                      setNotifyMessage('');
                                      setNotifyOpen(true);
                                    }}
                                    disabled={notifyMutation.isPending}
                                  >
                                    <Mail className="h-3.5 w-3.5" />
                                    Notify
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant={'outline'}
                                    className="gap-1.5"
                                    onClick={() => {
                                      setActionState({ type: '', message: '' });
                                      setBlockTarget(item);
                                      setBlockReason(item.blockReason || '');
                                      setBlockOpen(true);
                                    }}
                                    disabled={
                                      !canModerate || blockMutation.isPending
                                    }
                                  >
                                    {item.isBlocked ? (
                                      <UserCheck className="h-3.5 w-3.5" />
                                    ) : (
                                      <Ban className="h-3.5 w-3.5" />
                                    )}
                                    {item.isBlocked ? 'Unblock' : 'Block'}
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="destructiveoutline"
                                    className="gap-1.5"
                                    onClick={() => {
                                      setActionState({ type: '', message: '' });
                                      setRemoveTarget(item);
                                      setRemoveOpen(true);
                                    }}
                                    disabled={
                                      !canModerate || removeMutation.isPending
                                    }
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              </div>
            </section>
          </>
        ) : null}
      </main>

      <Dialog open={notifyOpen} onOpenChange={setNotifyOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Notify User
            </DialogTitle>
            <DialogDescription>
              Send a direct admin notification to{' '}
              {notifyTarget?.email || 'user'}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              value={notifySubject}
              onChange={(e) => setNotifySubject(e.target.value)}
              placeholder="Subject"
              maxLength={200}
            />
            <Textarea
              value={notifyMessage}
              onChange={(e) => setNotifyMessage(e.target.value)}
              placeholder="Write your message"
              className="min-h-28"
              maxLength={5000}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNotifyOpen(false)}
              disabled={notifyMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                notifyMutation.mutate({
                  userId: notifyTarget?._id,
                  subject: notifySubject,
                  message: notifyMessage,
                })
              }
              disabled={
                notifyMutation.isPending ||
                !notifyTarget ||
                !notifySubject.trim() ||
                !notifyMessage.trim()
              }
              className="gap-2"
            >
              {notifyMutation.isPending ? (
                <Spinner className="h-4 w-4" />
              ) : null}
              Send Notification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircleWarning className="h-4 w-4" />
              {blockTarget?.isBlocked ? 'Unblock User' : 'Block User'}
            </DialogTitle>
            <DialogDescription>
              {blockTarget?.isBlocked
                ? `Restore access for ${blockTarget?.email}.`
                : `Block ${blockTarget?.email} from logging in.`}
            </DialogDescription>
          </DialogHeader>

          {!blockTarget?.isBlocked ? (
            <Textarea
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Reason for block"
              className="min-h-24"
              maxLength={500}
            />
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBlockOpen(false)}
              disabled={blockMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant={
                blockTarget?.isBlocked ? 'secondary' : 'destructiveoutline'
              }
              onClick={() =>
                blockMutation.mutate({
                  userId: blockTarget?._id,
                  blocked: !blockTarget?.isBlocked,
                  reason: blockReason,
                })
              }
              disabled={
                blockMutation.isPending ||
                !blockTarget ||
                (!blockTarget?.isBlocked && !blockReason.trim())
              }
              className="gap-2"
            >
              {blockMutation.isPending ? <Spinner className="h-4 w-4" /> : null}
              {blockTarget?.isBlocked ? 'Unblock User' : 'Block User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Remove User
            </DialogTitle>
            <DialogDescription>
              This permanently removes {removeTarget?.email} and all associated
              projects, files, embeddings, and chats.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoveOpen(false)}
              disabled={removeMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructiveoutline"
              onClick={() => removeMutation.mutate(removeTarget?._id)}
              disabled={removeMutation.isPending || !removeTarget}
              className="gap-2"
            >
              {removeMutation.isPending ? (
                <Spinner className="h-4 w-4" />
              ) : null}
              Permanently Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
