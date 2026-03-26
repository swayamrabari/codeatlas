import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { projectAPI } from '../services/api';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  GitBranch,
  FileArchive,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  CloudUpload,
  FolderSearch,
  AlertCircle,
  FileText,
  X,
  RotateCcw,
  Layers,
  BookOpen,
  Database,
} from 'lucide-react';

/* ──────────────────── constants ──────────────────── */
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/* ──────────────────── step config ──────────────────── */
const STEPS = [
  { id: 1, label: 'Choose Method' },
  { id: 2, label: 'Provide Source' },
  { id: 3, label: 'Processing' },
  { id: 4, label: 'Complete' },
];

/* unified 6-step pipelines — first step differs by upload method */
const PIPELINE_ZIP = [
  {
    key: 'uploading',
    label: 'Uploading & extracting archive',
    icon: CloudUpload,
  },
  { key: 'scanning', label: 'Scanning project files', icon: FolderSearch },
  { key: 'file-docs', label: 'Generating file documentation', icon: FileText },
  {
    key: 'feature-docs',
    label: 'Generating feature documentation',
    icon: Layers,
  },
  { key: 'project-docs', label: 'Generating project overview', icon: BookOpen },
  { key: 'embeddings', label: 'Building search embeddings', icon: Database },
];

const PIPELINE_GIT = [
  { key: 'cloning', label: 'Cloning repository', icon: GitBranch },
  { key: 'scanning', label: 'Scanning project files', icon: FolderSearch },
  { key: 'file-docs', label: 'Generating file documentation', icon: FileText },
  {
    key: 'feature-docs',
    label: 'Generating feature documentation',
    icon: Layers,
  },
  { key: 'project-docs', label: 'Generating project overview', icon: BookOpen },
  { key: 'embeddings', label: 'Building search embeddings', icon: Database },
];

/* Map backend doc-progress step keys → pipeline index (steps 2-5 = AI) */
const STEP_KEY_TO_INDEX = {
  uploading: 0,
  cloning: 0,
  scanning: 1,
  'file-docs': 2,
  'feature-docs': 3,
  'project-docs': 4,
  embeddings: 5,
  done: 6,
};

/* ──────────────────── stepper ──────────────────── */
function Stepper({ current }) {
  return (
    <div className="mb-10 flex items-center justify-center gap-0">
      {STEPS.map((step, i) => {
        const isActive = step.id === current;
        const isComplete = step.id < current;
        return (
          <div key={step.id} className="flex items-center">
            {/* node */}
            <div className="flex flex-col items-center">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-300 ${
                  isComplete
                    ? 'border-primary bg-primary text-primary-foreground'
                    : isActive
                      ? 'border-primary bg-primary/10 text-primary scale-110'
                      : 'border-muted-foreground/30 text-muted-foreground'
                }`}
              >
                {isComplete ? <CheckCircle2 className="h-5 w-5" /> : step.id}
              </div>
              <span
                className={`mt-2 text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive || isComplete
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                {step.label}
              </span>
            </div>
            {/* connector */}
            {i < STEPS.length - 1 && (
              <div
                className={`mx-3 mb-5 h-0.5 w-14 rounded-full transition-colors duration-300 ${
                  step.id < current ? 'bg-primary' : 'bg-muted-foreground/20'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ──────────────────── pipeline progress ──────────────────── */
function PipelineView({ stages, activeIndex, error, detail }) {
  return (
    <div className="space-y-3">
      {stages.map((stage, i) => {
        const Icon = stage.icon;
        const isActive = i === activeIndex;
        const isComplete = i < activeIndex;
        const isFailed = error && i === activeIndex;
        return (
          <div
            key={stage.key}
            className={`flex items-center gap-4 rounded-lg border-2 px-3 py-3 transition-all duration-500 ${
              isFailed
                ? 'border-destructive/50 bg-destructive/5'
                : isActive
                  ? 'border-primary bg-primary/10 shadow-sm shadow-primary/10'
                  : isComplete
                    ? 'border-border bg-primary/5'
                    : 'border-border bg-card/50 opacity-50'
            }`}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                isFailed
                  ? 'bg-destructive/15 text-destructive'
                  : isComplete
                    ? 'bg-primary/15 text-primary'
                    : isActive
                      ? 'bg-primary/15 text-primary'
                      : 'bg-muted text-muted-foreground'
              }`}
            >
              {isFailed ? (
                <AlertCircle className="h-4 w-4" />
              ) : isActive ? (
                <Spinner className="h-4 w-4 text-primary" />
              ) : isComplete ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span
                className={`text-sm font-medium ${
                  isFailed
                    ? 'text-destructive'
                    : isActive || isComplete
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                }`}
              >
                {stage.label}
              </span>
              {/* Show live detail text for the active step */}
              {isActive && !isFailed && detail && (
                <span className="text-xs text-muted-foreground mt-0.5 truncate">
                  {detail}
                </span>
              )}
            </div>
            {isComplete && (
              <Badge
                variant="secondary"
                className="ml-auto text-[10px] bg-primary/10 text-primary border-0 shrink-0"
              >
                Done
              </Badge>
            )}
            {isActive && !isFailed && (
              <span className="ml-auto text-xs text-muted-foreground animate-pulse shrink-0">
                {detail ? 'Working...' : 'In progress...'}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
export default function UploadProject() {
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState(''); // 'zip' | 'git'
  const [file, setFile] = useState(null);
  const [gitUrl, setGitUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pipelineIndex, setPipelineIndex] = useState(0);
  const [pipelineDetail, setPipelineDetail] = useState(null);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [resultData, setResultData] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const uploadingRef = useRef(false);

  const [projectId, setProjectId] = useState(null);
  const [projectName, setProjectName] = useState('');
  const sseRef = useRef(null);
  const pollRef = useRef(null);
  const [searchParams] = useSearchParams();

  /* keep ref in sync */
  useEffect(() => {
    uploadingRef.current = uploading;
  }, [uploading]);

  /* Current pipeline stages based on method */
  const pipeline = method === 'git' ? PIPELINE_GIT : PIPELINE_ZIP;

  /* ── SSE connection helper ── */
  const _disconnectSSE = useCallback(() => {
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }
  }, []);

  /* ── Fetch final project status when pipeline is done ── */
  const _fetchFinalStatus = useCallback(
    async (pid) => {
      try {
        const res = await projectAPI.getProjectStatus(pid);
        setResultData({
          projectId: pid,
          projectName: res.data?.name || projectName || '',
          data: {
            summary: {
              files: res.data?.totalFiles,
              features: res.data?.featureCount,
            },
          },
        });
        setStep(4);
        setUploading(false);
      } catch {
        setResultData({
          projectId: pid,
          projectName: projectName || '',
          data: { summary: {} },
        });
        setStep(4);
        setUploading(false);
      }
    },
    [projectName],
  );

  /* ── Fallback polling if SSE fails ── */
  const _startFallbackPolling = useCallback(
    (pid) => {
      if (pollRef.current) return;
      pollRef.current = setInterval(async () => {
        try {
          const res = await projectAPI.getProjectStatus(pid);
          const status = res.data?.status;
          const progress = res.data?.docProgress;

          if (res.data?.name) setProjectName(res.data.name);

          if (progress?.step) {
            const idx = STEP_KEY_TO_INDEX[progress.step];
            if (idx !== undefined) {
              setPipelineIndex(idx);
              setPipelineDetail(progress.detail || null);
            }
          }

          if (
            status === 'ready' ||
            progress?.step === 'done' ||
            progress?.step === 'error'
          ) {
            clearInterval(pollRef.current);
            pollRef.current = null;
            if (progress?.step === 'error') {
              setError(progress.detail || 'Documentation generation failed');
            } else {
              setPipelineIndex(6);
              setPipelineDetail(null);
              _fetchFinalStatus(pid);
            }
          }
        } catch {
          /* keep polling */
        }
      }, 3000);
    },
    [_fetchFinalStatus],
  );

  const _connectSSE = useCallback(
    (pid) => {
      _disconnectSSE();
      const token = localStorage.getItem('token');
      if (!token) {
        _startFallbackPolling(pid);
        return;
      }

      const url = `${API_URL}/projects/${pid}/overview/progress?token=${encodeURIComponent(token)}`;
      const es = new EventSource(url);
      sseRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const stepKey = data.step;

          if (stepKey === 'done') {
            _disconnectSSE();
            setPipelineIndex(6);
            setPipelineDetail(null);
            _fetchFinalStatus(pid);
            return;
          }

          if (stepKey === 'error') {
            _disconnectSSE();
            setError(data.detail || 'Documentation generation failed');
            return;
          }

          const idx = STEP_KEY_TO_INDEX[stepKey];
          if (idx !== undefined) {
            setPipelineIndex(idx);
            setPipelineDetail(data.detail || null);
          }
        } catch {
          /* ignore parse errors */
        }
      };

      es.onerror = () => {
        _disconnectSSE();
        _startFallbackPolling(pid);
      };
    },
    [_disconnectSSE, _fetchFinalStatus, _startFallbackPolling],
  );

  const _cleanupAll = useCallback(() => {
    _disconnectSSE();
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, [_disconnectSSE]);

  useEffect(() => {
    return () => _cleanupAll();
  }, [_cleanupAll]);

  /* ── Resume flow: if ?resume=PROJECT_ID, jump to step 3 ── */
  useEffect(() => {
    const resumeId = searchParams.get('resume');
    if (!resumeId) return;

    const resumeMethod = searchParams.get('method') || 'zip';
    setProjectId(resumeId);
    setMethod(resumeMethod);
    setStep(3);
    setUploading(true);
    setPipelineIndex(2); // skip upload+scan, start at AI steps
    setPipelineDetail(null);
    _connectSSE(resumeId);

    return () => _cleanupAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Enter doc generation phase after upload API returns ── */
  const _enterDocPhase = useCallback(
    (pid) => {
      setProjectId(pid);
      setPipelineIndex(2); // upload + scan done → first AI step
      setPipelineDetail(null);
      _connectSSE(pid);
    },
    [_connectSSE],
  );

  /* ── drag & drop ── */
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError('');
    if (e.dataTransfer.files?.[0]) {
      const f = e.dataTransfer.files[0];
      if (f.name.endsWith('.zip')) setFile(f);
      else setError('Please upload a ZIP file');
    }
  }, []);

  const handleFileChange = (e) => {
    setError('');
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ── ZIP upload ── */
  const handleZipUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    setUploadProgress(0);
    setPipelineIndex(0);
    setPipelineDetail(null);
    setStep(3);

    try {
      const result = await projectAPI.uploadZip(file, (progressEvent) => {
        const pct = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total,
        );
        setUploadProgress(pct);
        if (pct >= 100) {
          setPipelineIndex(1);
          setPipelineDetail('Analyzing project structure...');
        }
      });
      setResultData(result);
      setProjectName(result.projectName || '');
      _enterDocPhase(result.projectId);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.error || err.message || 'Upload failed');
      setUploading(false);
    }
  };

  /* ── Git upload ── */
  const handleGitUpload = async () => {
    const trimmedUrl = gitUrl.trim();
    if (!trimmedUrl) return;
    if (
      !trimmedUrl.includes('github.com') &&
      !trimmedUrl.includes('gitlab.com') &&
      !trimmedUrl.includes('bitbucket.org')
    ) {
      setError('Please enter a valid GitHub, GitLab, or Bitbucket URL');
      return;
    }

    setUploading(true);
    setError('');
    setPipelineIndex(0);
    setPipelineDetail('Connecting to repository...');
    setStep(3);

    try {
      const result = await projectAPI.uploadGit(trimmedUrl);
      setResultData(result);
      setProjectName(result.projectName || '');
      _enterDocPhase(result.projectId);
    } catch (err) {
      console.error('Git upload error:', err);
      let errorMessage = 'Failed to clone repository';
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        errorMessage =
          'Request timed out. The repository might be too large or your connection is slow.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      setUploading(false);
    }
  };

  /* ── reset ── */
  const resetAll = () => {
    _cleanupAll();
    setStep(1);
    setMethod(null);
    setFile(null);
    setGitUrl('');
    setUploading(false);
    setUploadProgress(0);
    setPipelineIndex(0);
    setPipelineDetail(null);
    setError('');
    setResultData(null);
    setProjectId(null);
    setProjectName('');
  };

  /* ──────────────── RENDER ──────────────── */
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="mb-2 text-center text-3xl font-bold tracking-tight text-foreground">
          Upload Your Project
        </h1>
        <p className="mb-8 text-center text-sm font-medium text-muted-foreground">
          We'll analyze your codebase and will help you to undertand your
          project!
        </p>

        <Stepper current={step} />

        {/* ── STEP 1: Choose Method ── */}
        {step === 1 && (
          <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
            <p className="mb-5 text-center font-medium text-muted-foreground">
              How would you like to import your project?
            </p>
            <div className="grid grid-cols-2 gap-4">
              {/* ZIP */}
              <button
                onClick={() => {
                  setMethod('zip');
                  setStep(2);
                  setError('');
                }}
                className={`group relative flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 bg-card p-8 transition-all duration-200 hover:border-primary/70 hover:shadow-md hover:shadow-primary/5 ${
                  method === 'zip'
                    ? 'border-primary/70 shadow-md shadow-primary/5'
                    : 'border-border'
                }`}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <FileArchive className="h-7 w-7" />
                </div>
                <span className="text-base font-semibold text-foreground">
                  Upload ZIP
                </span>
                <span className="text-xs text-muted-foreground text-center">
                  Upload a compressed archive of your project
                </span>
              </button>

              {/* Git */}
              <button
                onClick={() => {
                  setMethod('git');
                  setStep(2);
                  setError('');
                }}
                className={`group relative flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 bg-card p-8 transition-all duration-200 hover:border-primary/70 hover:shadow-md hover:shadow-primary/5 ${
                  method === 'git'
                    ? 'border-primary/70 shadow-md shadow-primary/5'
                    : 'border-border'
                }`}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <GitBranch className="h-7 w-7" />
                </div>
                <span className="text-base font-semibold text-foreground">
                  Git Repository
                </span>
                <span className="text-xs text-muted-foreground text-center">
                  Clone directly from GitHub, GitLab or Bitbucket
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Provide Source ── */}
        {step === 2 && (
          <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
            {method === 'zip' ? (
              <Card className="border border-border bg-card overflow-hidden">
                <CardContent className="px-6 pt-1">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <FileArchive className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">
                        Upload ZIP File
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Select a .zip archive containing your project source
                      </p>
                    </div>
                  </div>

                  {/* Drop zone */}
                  <div
                    className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-all duration-200 ${
                      dragActive
                        ? 'border-primary bg-primary/5 scale-[1.01]'
                        : file
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-border hover:border-muted-foreground/50 cursor-pointer'
                    }`}
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => !file && fileInputRef.current?.click()}
                  >
                    {file ? (
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile();
                          }}
                          className="ml-2 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <CloudUpload className="mb-3 h-10 w-10 text-muted-foreground/60" />
                        <p className="text-sm font-medium text-foreground">
                          Drag &amp; drop your ZIP file here
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          or click to browse files
                        </p>
                      </>
                    )}
                    <input
                      type="file"
                      accept=".zip"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>

                  {error && (
                    <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
                      <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                      <p className="text-sm text-destructive">{error}</p>
                    </div>
                  )}

                  <div className="mt-6 flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setStep(1);
                        setError('');
                      }}
                    >
                      <ArrowLeft className="mr-1 h-4 w-4" /> Back
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleZipUpload}
                      disabled={!file}
                    >
                      Start Analysis <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border border-border bg-card overflow-hidden">
                <CardContent className="px-6 pt-1">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <GitBranch className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">
                        Git Repository
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Enter the URL of a public repository
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="git-url" className="text-foreground">
                      Repository URL
                    </Label>
                    <Input
                      id="git-url"
                      type="text"
                      placeholder="https://github.com/user/repo"
                      value={gitUrl}
                      onChange={(e) => {
                        setGitUrl(e.target.value);
                        setError('');
                      }}
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">
                      Supports GitHub, GitLab and Bitbucket
                    </p>
                  </div>

                  {error && (
                    <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
                      <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                      <p className="text-sm text-destructive">{error}</p>
                    </div>
                  )}

                  <div className="mt-6 flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setStep(1);
                        setError('');
                      }}
                    >
                      <ArrowLeft className="mr-1 h-4 w-4" /> Back
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleGitUpload}
                      disabled={!gitUrl.trim()}
                    >
                      Start Analysis <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ── STEP 3: Processing — Unified 6-step pipeline ── */}
        {step === 3 && (
          <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
            <Card className="border border-border bg-card overflow-hidden">
              <CardContent className="px-6 pt-1">
                <div className="mb-2 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {error ? (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    ) : (
                      <Spinner className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      {error
                        ? 'Something went wrong'
                        : 'Analyzing your project'}
                    </h2>
                    <p className="text-xs font-medium text-muted-foreground">
                      {error
                        ? 'The process encountered an error'
                        : projectName
                          ? `"${projectName}" — Processing through 6-step pipeline`
                          : 'This may take a few minutes depending on the project size'}
                    </p>
                  </div>
                </div>

                {/* upload progress bar (ZIP only, step 0) */}
                {method === 'zip' && uploading && pipelineIndex === 0 && (
                  <div className="mb-5 mt-4">
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                      <span>Uploading</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}

                {/* overall progress */}
                {!error && (
                  <div className="mb-4 mt-3">
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                      <span>Overall Progress</span>
                      <span>
                        {Math.min(pipelineIndex, pipeline.length)} /{' '}
                        {pipeline.length} steps
                      </span>
                    </div>
                    <Progress
                      value={
                        (Math.min(pipelineIndex, pipeline.length) /
                          pipeline.length) *
                        100
                      }
                      className="h-1.5"
                    />
                  </div>
                )}

                <div className="mt-2">
                  <PipelineView
                    stages={pipeline}
                    activeIndex={pipelineIndex}
                    error={error}
                    detail={pipelineDetail}
                  />
                </div>

                {error && (
                  <div className="mt-5 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
                    <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                {error && (
                  <div className="mt-5 flex gap-3">
                    <Button variant="outline" onClick={resetAll}>
                      <RotateCcw className="mr-1 h-4 w-4" /> Start Over
                    </Button>
                    <Button
                      onClick={() => {
                        setError('');
                        if (method === 'zip') handleZipUpload();
                        else handleGitUpload();
                      }}
                    >
                      Retry
                    </Button>
                  </div>
                )}

                {!error && (
                  <p className="mt-5 text-xs text-muted-foreground text-center animate-pulse">
                    Please wait — progress updates automatically in real-time
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── STEP 4: Complete ── */}
        {step === 4 && resultData && (
          <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
            <Card className="border border-primary/30 bg-card overflow-hidden">
              <CardContent className="p-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle2 className="h-9 w-9 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  Analysis Complete!
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your project has been successfully analyzed and is ready to
                  explore.
                </p>

                {resultData.projectName && (
                  <Badge variant="secondary" className="mt-4 text-sm px-3 py-1">
                    {resultData.projectName}
                  </Badge>
                )}

                <div className="mt-4 flex justify-center gap-6 text-center text-sm text-muted-foreground">
                  {resultData.data?.summary?.files !== undefined && (
                    <div>
                      <p className="text-lg font-semibold text-foreground">
                        {resultData.data.summary.files}
                      </p>
                      <p>Files</p>
                    </div>
                  )}
                  {resultData.data?.summary?.features !== undefined && (
                    <div>
                      <p className="text-lg font-semibold text-foreground">
                        {resultData.data.summary.features}
                      </p>
                      <p>Features</p>
                    </div>
                  )}
                  {resultData.data?.summary?.relationships !== undefined && (
                    <div>
                      <p className="text-lg font-semibold text-foreground">
                        {resultData.data.summary.relationships}
                      </p>
                      <p>Relationships</p>
                    </div>
                  )}
                </div>

                <div className="mt-8 flex justify-center gap-3">
                  <Button variant="outline" onClick={resetAll}>
                    Upload Another
                  </Button>
                  <Button
                    onClick={() =>
                      navigate(`/project/${resultData.projectId}`, {
                        state: { data: resultData },
                      })
                    }
                  >
                    Open Project <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
