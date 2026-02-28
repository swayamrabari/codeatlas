import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/components/ui/card';
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
  LayoutGrid,
} from 'lucide-react';

function StatusBadge({ status }) {
  const map = {
    ready:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    processing:
      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    pending: 'bg-muted text-muted-foreground',
  };
  const label = {
    ready: 'Ready',
    processing: 'Processing',
    failed: 'Failed',
    pending: 'Pending',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        map[status] ?? map.pending
      }`}
    >
      {label[status] ?? status}
    </span>
  );
}

function ProjectCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card animate-pulse">
      <div className="p-5 space-y-3">
        <div className="h-4 w-2/3 rounded bg-muted" />
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-1/2 rounded bg-muted" />
        <div className="flex gap-2 pt-2">
          <div className="h-5 w-14 rounded-full bg-muted" />
          <div className="h-5 w-14 rounded-full bg-muted" />
        </div>
      </div>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function UserDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    projectAPI
      .listProjects()
      .then((res) => setProjects(res.data || []))
      .catch((err) => {
        console.error('Failed to load projects:', err);
        setError('Failed to load projects. Please refresh.');
      })
      .finally(() => setLoading(false));
  }, []);

  const openDeleteDialog = (e, project) => {
    e.stopPropagation();
    setDeleteTarget(project);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await projectAPI.deleteProject(deleteTarget._id);
      setProjects((prev) => prev.filter((p) => p._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete project:', err);
      setError('Failed to delete project. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const readyCount = projects.filter((p) => p.status === 'ready').length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="mx-auto max-w-7xl px-6 py-10 space-y-10">
        {/* ── Welcome Banner ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold select-none">
              {user?.name?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground leading-tight">
                Welcome back, {user?.name?.split(' ')[0]}
              </h1>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/upload')}
            className="gap-2 shrink-0"
          >
            <Upload className="h-4 w-4" />
            New Project
          </Button>
        </div>

        {/* ── Stats Row ── */}
        {!loading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                icon: <LayoutGrid className="h-5 w-5 text-primary" />,
                label: 'Total Projects',
                value: projects.length,
              },
              {
                icon: <FileCode2 className="h-5 w-5 text-emerald-500" />,
                label: 'Ready',
                value: readyCount,
              },
              {
                icon: <GitBranch className="h-5 w-5 text-violet-500" />,
                label: 'Git Repos',
                value: projects.filter((p) => p.uploadType === 'github').length,
              },
              {
                icon: <Package className="h-5 w-5 text-amber-500" />,
                label: 'ZIP Uploads',
                value: projects.filter((p) => p.uploadType !== 'github').length,
              },
            ].map((stat) => (
              <Card key={stat.label} className="border border-border">
                <CardContent className="flex items-center gap-3 pt-5 pb-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    {stat.icon}
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground leading-none">
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {stat.label}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ── Projects Grid ── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-foreground">
              Your Projects
            </h2>
            {projects.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {projects.length} project{projects.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <ProjectCardSkeleton key={i} />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 gap-5 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <FolderOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">No projects yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload a ZIP or connect a Git repo to get started.
                </p>
              </div>
              <Button onClick={() => navigate('/upload')} className="gap-2">
                <Upload className="h-4 w-4" />
                Upload your first project
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <div
                  key={project._id}
                  onClick={() => navigate(`/project/${project._id}`)}
                  className="group relative rounded-xl border border-border bg-card hover:bg-accent/40 hover:border-primary/30 transition-all cursor-pointer"
                >
                  {/* Delete button */}
                  <button
                    onClick={(e) => openDeleteDialog(e, project)}
                    className="absolute top-3 right-3 z-10 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    title="Delete project"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <div className="p-5 space-y-3">
                    {/* Header row */}
                    <div className="flex items-start gap-2 pr-6">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        {project.uploadType === 'github' ? (
                          <GitBranch className="h-4 w-4" />
                        ) : (
                          <Package className="h-4 w-4" />
                        )}
                      </div>
                      <CardTitle className="text-sm font-semibold leading-snug break-all">
                        {project.name}
                      </CardTitle>
                    </div>

                    {/* Description */}
                    <CardDescription className="text-xs line-clamp-2 min-h-10">
                      {project.description ||
                        `${project.stats?.projectType || 'Unknown'} project · ${
                          project.stats?.totalFiles || 0
                        } files`}
                    </CardDescription>

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <StatusBadge status={project.status} />
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <FileCode2 className="h-3 w-3" />
                        {project.stats?.totalFiles ?? 0} files
                      </span>
                      {project.createdAt && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                          <Clock className="h-3 w-3" />
                          {formatDate(project.createdAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
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
              This will permanently delete{' '}
              <span className="font-semibold text-foreground">
                &ldquo;{deleteTarget?.name}&rdquo;
              </span>{' '}
              and all associated files, features, and analysis data. This action
              cannot be undone.
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
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Deleting…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
