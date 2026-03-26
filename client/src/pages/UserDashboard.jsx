import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { projectAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Header from '@/components/Header';
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
  Trash2,
  Upload,
  FolderOpen,
  GitBranch,
  Package,
  Clock,
  FileCode2,
  ArrowRight,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

/* ── Palette: one accent colour per card slot (cycles) ── */

function statusConfig(status) {
  const cfg = {
    ready: {
      label: 'Ready',
      cls: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30',
      pulse: false,
    },
    documenting: {
      label: 'Generating Docs…',
      cls: 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30',
      pulse: true,
    },
    analyzing: {
      label: 'Analyzing',
      cls: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30',
      pulse: true,
    },
    scanning: {
      label: 'Scanning',
      cls: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30',
      pulse: true,
    },
    uploading: {
      label: 'Uploading',
      cls: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30',
      pulse: true,
    },
    processing: {
      label: 'Processing',
      cls: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30',
      pulse: true,
    },
    failed: {
      label: 'Failed',
      cls: 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30',
      pulse: false,
    },
  };
  return (
    cfg[status] ?? {
      label: status,
      cls: 'bg-muted text-muted-foreground',
      pulse: false,
    }
  );
}

function StatusBadge({ status }) {
  const { label, cls, pulse } = statusConfig(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${cls}`}
    >
      {pulse && (
        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
      )}
      {label}
    </span>
  );
}

function ProjectCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden animate-pulse">
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-muted shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 rounded-md bg-muted" />
            <div className="h-3 w-1/3 rounded-md bg-muted" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-4/5 rounded bg-muted" />
        </div>
        <div className="flex gap-2 pt-1">
          <div className="h-6 w-16 rounded-full bg-muted" />
          <div className="h-6 w-12 rounded-full bg-muted" />
        </div>
      </div>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function UserDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const {
    data: projectsRes,
    isLoading: loading,
    isError: hasProjectsError,
  } = useQuery({
    queryKey: ['userProjects'],
    queryFn: () => projectAPI.listProjects(),
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const projects = Array.isArray(projectsRes?.data) ? projectsRes.data : [];

  const openDeleteDialog = (e, project) => {
    e.stopPropagation();
    setDeleteTarget(project);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await projectAPI.deleteProject(deleteTarget._id);

      queryClient.setQueryData(['userProjects'], (prev) => {
        const prevProjects = Array.isArray(prev?.data) ? prev.data : [];
        return {
          ...prev,
          data: prevProjects.filter((p) => p._id !== deleteTarget._id),
        };
      });

      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete project:', err);
      setError('Failed to delete project. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const initials = (name = '') =>
    name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="mx-auto max-w-7xl px-6 py-12 space-y-12">
        {/* ── Hero Banner ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="flex h-13 w-13 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold select-none">
                {initials(user?.name)}
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground leading-tight">
                {user?.name?.split(' ')[0]}
              </h1>
              <p className="text-sm font-medium text-muted-foreground">
                {user?.email}
              </p>
            </div>
          </div>

          <Button
            onClick={() => navigate('/upload')}
            size="lg"
            className="gap-2.5 shrink-0"
          >
            <Upload className="h-4 w-4 stroke-[2.5px]" />
            New Project
          </Button>
        </div>

        {/* ── Projects Section ── */}
        <section className="space-y-6">
          {/* Section heading */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Your Projects
              </h2>
              {!loading && projects.length > 0 && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {projects.length} project{projects.length !== 1 ? 's' : ''} ·{' '}
                  {projects.filter((p) => p.status === 'ready').length} ready
                </p>
              )}
            </div>
          </div>

          {(error || hasProjectsError) && (
            <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error || 'Failed to load projects. Please refresh.'}
            </div>
          )}

          {/* Grid */}
          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <ProjectCardSkeleton key={i} />
              ))}
            </div>
          ) : projects.length === 0 ? (
            /* ── Empty State ── */
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/10 py-24 gap-6 text-center">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/60">
                  <FolderOpen className="h-9 w-9 text-muted-foreground" />
                </div>
                <div className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary">
                  <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
              </div>
              <div className="space-y-1.5 max-w-xs">
                <p className="text-lg font-bold text-foreground">
                  No projects yet
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Upload a ZIP archive or connect a GitHub repository to start
                  exploring your codebase with AI.
                </p>
              </div>
              <Button
                onClick={() => navigate('/upload')}
                size="lg"
                className="gap-2 rounded-xl"
              >
                <Upload className="h-4 w-4" />
                Upload your first project
              </Button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => {
                const isGit = project.uploadType === 'github';
                return (
                  <div
                    key={project._id}
                    onClick={() =>
                      project.status === 'documenting'
                        ? navigate(`/upload?resume=${project._id}`)
                        : navigate(`/project/${project._id}`)
                    }
                    className={`group relative flex flex-col rounded-2xl border border-border bg-card overflow-hidden cursor-pointer transition-all duration-200`}
                  >
                    {/* Delete button */}
                    <button
                      onClick={(e) => openDeleteDialog(e, project)}
                      className="absolute top-4 p-1 right-4 z-10 flex h-7 w-7 items-center justify-center rounded-md text-destructive bg-destructive/10 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-all"
                      title="Delete project"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <div className="flex flex-col flex-1 p-6 gap-4">
                      {/* Icon + name */}
                      <div className="flex items-start gap-3 pr-6">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md p-1 transition-transform text-blue-500 bg-blue-500/20 duration-200`}
                        >
                          {isGit ? (
                            <GitBranch className="h-6 w-6" />
                          ) : (
                            <Package className="h-6 w-6" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <h3 className="text-sm font-bold text-foreground leading-snug truncate">
                            {project.name}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                            {isGit ? 'GitHub Repository' : 'ZIP Upload'}
                          </p>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 flex-1">
                        {project.description ||
                          `${project.stats?.projectType || 'Unknown'} project with ${project.stats?.totalFiles || 0} files analyzed.`}
                      </p>

                      {/* Divider */}
                      <div className="border-t border-border" />

                      {/* Footer meta */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={project.status} />
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                            <FileCode2 className="h-3 w-3" />
                            {project.stats?.totalFiles ?? 0}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground shrink-0">
                          <Clock className="h-3 w-3" />
                          {formatDate(project.createdAt)}
                        </div>
                      </div>

                      {/* Open hint */}
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground/50 group-hover:text-muted-foreground transition-colors -mt-1">
                        <span>Open project</span>
                        <ArrowRight className="h-3 w-3 translate-x-0 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deleteTarget?.name}? <br />
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructiveoutline"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <span className="flex items-center gap-2">Deleting…</span>
              ) : (
                <span className="flex items-center gap-2">Delete</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
