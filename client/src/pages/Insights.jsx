import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { projectAPI } from '../services/api';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Box,
  File,
  Share2,
  Layers,
  FileCode,
  BookOpen,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

export default function Insights({ projectId }) {
  const { state } = useLocation();
  const [data, setData] = useState(state?.data?.data || null);
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState({ type: 'overview' });

  useEffect(() => {
    if (!data && projectId) {
      projectAPI
        .getProject(projectId)
        .then((response) => {
          setData(response.data);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Failed to load project data:', err);
          setError('Failed to load project data.');
          setLoading(false);
        });
    } else if (data) {
      setLoading(false);
    }
  }, [projectId, data]);

  const { processedFiles, frameworksList, featuresList } = useMemo(() => {
    if (!data)
      return { processedFiles: [], frameworksList: [], featuresList: [] };

    const fwList = [];
    if (data.frameworks) {
      Object.values(data.frameworks).forEach((list) => {
        if (Array.isArray(list)) fwList.push(...list);
      });
    }

    const rawFiles = data.files ?? data.data?.files;
    const processed =
      rawFiles?.map((f) => ({
        ...f,
        path: f.path.replace(/\\/g, '/'),
      })) || [];

    const rawFeatures = data.features ?? data.data?.features;
    const features = rawFeatures
      ? Object.entries(rawFeatures)
          .map(([keyword, feat]) => ({ keyword, ...feat }))
          .sort((a, b) => a.name.localeCompare(b.name))
      : [];

    return {
      processedFiles: processed,
      frameworksList: [...new Set(fwList)],
      featuresList: features,
    };
  }, [data]);

  const selectedFeature = useMemo(() => {
    if (selected.type !== 'feature') return null;
    return featuresList.find((f) => f.keyword === selected.key) || null;
  }, [selected, featuresList]);

  const selectedFile = useMemo(() => {
    if (selected.type !== 'file') return null;
    return processedFiles.find((f) => f.path === selected.key) || null;
  }, [selected, processedFiles]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading analysis data...</p>
        </div>
      </div>
    );
  }

  if (error) return <div className="p-8 text-destructive">{error}</div>;
  if (!data) return null;

  const resolvedData = data.data ?? data;

  return (
    <div className="h-full flex overflow-hidden bg-background">
      {/* LEFT SIDEBAR */}
      <div className="flex h-full min-h-0 w-80 flex-col overflow-hidden border-r bg-muted/5">
        <ScrollArea className="h-full flex-1">
          <div className="max-w-[320px] overflow-hidden p-2 pb-20 space-y-0.5">
            {/* Project Overview */}
            <div
              className={`flex cursor-pointer select-none items-center gap-1.5 overflow-hidden rounded px-2 py-1.5 my-1 font-mono text-sm transition-colors ${
                selected.type === 'overview'
                  ? 'bg-secondary text-foreground'
                  : 'hover:bg-secondary text-foreground'
              }`}
              onClick={() => setSelected({ type: 'overview' })}
            >
              <span className="shrink-0 text-muted-foreground">
                <BookOpen className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate">Project Overview</span>
            </div>

            {/* Features */}
            {featuresList.length > 0 && (
              <div className="pt-1 flex flex-col gap-0.5">
                <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Features ({featuresList.length})
                </p>
                {featuresList.map((feat) => (
                  <FeatureSidebarItem
                    key={feat.keyword}
                    feature={feat}
                    selected={selected}
                    isSelected={
                      selected.type === 'feature' &&
                      selected.key === feat.keyword
                    }
                    onSelect={() =>
                      setSelected({ type: 'feature', key: feat.keyword })
                    }
                    onSelectFile={(path) =>
                      setSelected({
                        type: 'file',
                        key: path,
                        featureKeyword: feat.keyword,
                      })
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* RIGHT CONTENT PANE */}
      <div className="flex-1 h-full overflow-auto">
        {selected.type === 'overview' ? (
          <ProjectMetadataPane
            data={resolvedData}
            processedFiles={processedFiles}
            frameworksList={frameworksList}
            featuresList={featuresList}
          />
        ) : selectedFile ? (
          <FileDetails file={selectedFile} />
        ) : selectedFeature ? (
          <FeatureDetails feature={selectedFeature} />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <p>Select an item from the sidebar</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Feature Sidebar Item ── */
function FeatureSidebarItem({
  feature,
  selected,
  isSelected,
  onSelect,
  onSelectFile,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const allFiles = feature.allFiles || [];
  const hasSelectedFile =
    selected.type === 'file' &&
    selected.featureKeyword === feature.keyword &&
    allFiles.includes(selected.key);

  useEffect(() => {
    if (hasSelectedFile) setIsOpen(true);
  }, [hasSelectedFile]);

  return (
    <div className="max-w-full overflow-hidden">
      {/* Feature row */}
      <div
        className={`flex cursor-pointer select-none items-center gap-1.5 overflow-hidden rounded py-1.5 font-mono text-sm transition-colors ${
          isSelected
            ? 'bg-secondary text-foreground'
            : 'hover:bg-secondary text-foreground'
        }`}
        style={{ paddingLeft: '8px', paddingRight: '8px' }}
        onClick={onSelect}
      >
        {/* Chevron toggle */}
        <span
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
        >
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </span>
        <span className="min-w-0 flex-1 truncate flex gap-0.5 items-center capitalize">
          <Layers className="h-4 w-4 text-muted-foreground mr-1" />
          {feature.name}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {feature.fileCount}
        </span>
      </div>

      {/* Files list */}
      {isOpen && allFiles.length > 0 && (
        <div className="relative mt-0.5">
          <span
            className="absolute top-0 bottom-0 w-[1.5px] bg-secondary"
            style={{ left: '15px' }}
          />
          <div className="space-y-0.5">
            {allFiles.map((filePath, i) => (
              <div
                key={i}
                className={`flex cursor-pointer select-none items-center gap-1.5 overflow-hidden rounded py-1.5 font-mono text-sm transition-colors ${
                  selected.type === 'file' &&
                  selected.key === filePath &&
                  selected.featureKeyword === feature.keyword
                    ? 'bg-secondary text-foreground'
                    : 'hover:bg-secondary text-foreground'
                }`}
                style={{ paddingLeft: '30px', paddingRight: '8px' }}
                onClick={() => onSelectFile(filePath)}
              >
                <span className="shrink-0 text-muted-foreground">
                  <File className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {typeof filePath === 'string'
                    ? filePath.split('/').pop()
                    : filePath}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── File Details ── */
function FileDetails({ file }) {
  return (
    <div className="mx-auto space-y-10 animate-in fade-in duration-300 p-10 md:p-16 lg:p-20">
      <div className="space-y-2">
        <div className="text-3xl font-bold flex items-center gap-3 break-all ">
          <span className="p-2.5 bg-blue-500/20 rounded-lg">
            <File className="h-8 w-8 text-blue-500 " />
          </span>
          <div>
            <span>{file.path.split('/').pop()}</span>
            <p className="text-muted-foreground font-medium font-mono text-base">
              {file.path}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <TintedBadge label={file.type} type="type" />
          {file.category && (
            <TintedBadge label={file.category} type="category" />
          )}
          {file.role && <TintedBadge label={file.role} type="role" />}
          {file.behavior && (
            <TintedBadge label={file.behavior} type="behavior" />
          )}
        </div>
      </div>

      {((file.absoluteRoutes && file.absoluteRoutes.length > 0) ||
        (file.routes && file.routes.length > 0)) && (
        <section className="space-y-4">
          <SectionHeader
            title={
              file.mountPrefix
                ? `API Routes · ${file.mountPrefix}`
                : 'API Routes'
            }
          />
          <div className="space-y-2">
            {(file.absoluteRoutes && file.absoluteRoutes.length > 0
              ? file.absoluteRoutes
              : file.routes
            ).map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-4 py-1 border-border/40 last:border-0"
              >
                <TintedBadge label={r.method} type="method" />
                <span className="font-mono text-base text-foreground">
                  {r.path}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {file.thirdPartyDeps && file.thirdPartyDeps.length > 0 && (
        <section className="space-y-3">
          <SectionHeader
            title={`Third-Party Dependencies (${file.thirdPartyDeps.length})`}
          />
          <div className="flex flex-wrap gap-2">
            {file.thirdPartyDeps.map((dep) => (
              <Badge
                key={dep}
                variant="secondary"
                className="text-xs font-mono px-2.5 py-1 rounded-md"
              >
                {dep}
              </Badge>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <SectionHeader title="Connections" />
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-muted-foreground">
              Imports
            </div>
            <div className="text-2xl font-bold">{file.imports?.count || 0}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-semibold text-muted-foreground">
              Exports
            </div>
            <div className="text-2xl font-bold">{file.exportsCount || 0}</div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ── Project Metadata Pane ── */
function ProjectMetadataPane({
  data,
  processedFiles,
  frameworksList,
  featuresList,
}) {
  return (
    <div className="mx-auto space-y-10 animate-in fade-in duration-300 p-10 md:p-16 lg:p-20">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/20 rounded-lg">
            <BookOpen className="h-8 w-8 text-blue-500" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">
              Project Overview
            </h1>
          </div>
        </div>
      </div>

      {/* Stats */}
      <section className="space-y-4">
        <SectionHeader title="Project Stats" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard
            icon={<Box className="h-8 w-8 text-primary" />}
            label="Project Type"
            value={data.projectType || 'Unknown'}
            capitalize
          />
          <StatCard
            icon={<File className="h-8 w-8 text-primary" />}
            label="Total Files"
            value={processedFiles.length}
          />
          <StatCard
            icon={<Share2 className="h-8 w-8 text-primary" />}
            label="Relationships"
            value={data.relationshipStats?.totalRelationships ?? '—'}
          />
          <StatCard
            icon={<Layers className="h-8 w-8 text-primary" />}
            label="Features Detected"
            value={featuresList.length}
          />
          <StatCard
            icon={<FileCode className="h-8 w-8 text-primary" />}
            label="File Types"
            value={
              new Set(processedFiles.map((f) => f.type).filter(Boolean)).size
            }
          />
        </div>
      </section>

      {/* Frameworks */}
      {frameworksList.length > 0 && (
        <section className="space-y-3">
          <SectionHeader title="Frameworks Detected" />
          <div className="flex flex-wrap gap-2">
            {frameworksList.map((fw) => (
              <Badge
                key={fw}
                variant="secondary"
                className="text-xs uppercase rounded-md font-semibold px-3 py-1.5 whitespace-nowrap"
              >
                {fw}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {/* File Types Breakdown */}
      {processedFiles.length > 0 && (
        <section className="space-y-3">
          <SectionHeader title="File Types Breakdown" />
          <div className="flex flex-wrap gap-2">
            {Array.from(
              new Set(processedFiles.map((f) => f.type).filter(Boolean)),
            ).map((type) => {
              const count = processedFiles.filter(
                (f) => f.type === type,
              ).length;
              return (
                <Badge
                  key={type}
                  variant="outline"
                  className="text-xs bg-accent rounded-md uppercase font-semibold px-3 py-1.5"
                >
                  {type}
                  <span className="ml-1 text-muted-foreground">{count}</span>
                </Badge>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, capitalize }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <p
          className={`text-lg font-bold leading-tight truncate ${capitalize ? 'capitalize' : ''}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

/* ── Feature Details ── */
function FeatureDetails({ feature }) {
  const categorized = feature.categorized || {};
  const sharedDeps = feature.sharedDependencies || [];

  const sections = [
    { key: 'pages', label: 'Pages' },
    { key: 'controllers', label: 'Controllers' },
    { key: 'routes', label: 'Routes' },
    { key: 'models', label: 'Models' },
    { key: 'services', label: 'Services' },
    { key: 'middleware', label: 'Middleware' },
    { key: 'components', label: 'Components' },
    { key: 'stores', label: 'Stores' },
    { key: 'api', label: 'API Modules' },
    { key: 'utils', label: 'Utilities' },
    { key: 'config', label: 'Config' },
    { key: 'jobs', label: 'Jobs' },
    { key: 'events', label: 'Events' },
    { key: 'migrations', label: 'Migrations' },
    { key: 'seeds', label: 'Seeds' },
    { key: 'validators', label: 'Validators' },
    { key: 'hooks', label: 'Hooks' },
    { key: 'contexts', label: 'Contexts' },
    { key: 'layouts', label: 'Layouts' },
    { key: 'guards', label: 'Guards' },
    { key: 'styles', label: 'Styles' },
    { key: 'assets', label: 'Assets' },
    { key: 'tests', label: 'Tests' },
    { key: 'mocks', label: 'Mocks' },
    { key: 'other', label: 'Other' },
  ].filter((s) => categorized[s.key]?.length > 0);

  return (
    <div className="mx-auto space-y-10 animate-in fade-in duration-300 p-10 md:p-16 lg:p-20">
      {/* HEADER */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/20 rounded-lg">
            <Layers className="h-8 w-8 text-blue-500" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold capitalize">{feature.name}</h1>
            <p className="text-muted-foreground text-base font-semibold">
              {feature.fileCount} core files
              {sharedDeps.length > 0 &&
                ` + ${sharedDeps.length} shared dependencies`}
            </p>
          </div>
        </div>
      </div>

      {/* API ROUTES */}
      {feature.apiRoutes?.length > 0 && (
        <section className="space-y-4">
          <SectionHeader title="API Routes" />
          <div className="space-y-2">
            {feature.apiRoutes.map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-4 py-1 border-border/40 last:border-0"
              >
                <TintedBadge label={r.method} type="method" />
                <span className="font-mono text-base text-foreground">
                  {r.path}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CATEGORIZED FILE SECTIONS */}
      {sections.map((section) => {
        const files = categorized[section.key];
        return (
          <section key={section.key} className="space-y-3">
            <SectionHeader title={`${section.label} (${files.length})`} />
            <div className="space-y-1.5">
              {files.map((filePath, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-foreground"
                >
                  <span className="font-mono truncate">{filePath}</span>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {/* SHARED DEPENDENCIES */}
      {sharedDeps.length > 0 && (
        <section className="space-y-3">
          <SectionHeader title={`Shared Dependencies (${sharedDeps.length})`} />
          <p className="text-xs text-muted-foreground font-semibold">
            Generic UI components & utilities used by this feature but shared
            across the entire codebase.
          </p>
          <div className="space-y-1.5">
            {sharedDeps.map((dep, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-muted-foreground"
              >
                <span className="font-mono truncate">{dep}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <h3 className="text-base font-bold tracking-wide text-muted-foreground border-b pb-2">
      {title}
    </h3>
  );
}

function TintedBadge({ label, type }) {
  if (!label) return null;

  const base =
    'px-2 pt-1 pb-1 rounded text-xs font-semibold uppercase tracking-wide border border-transparent';

  const DEFAULT =
    'bg-gray-200 text-gray-900 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-transparent';

  const METHOD_STYLES = {
    GET: 'bg-blue-200 text-blue-900 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-transparent',
    POST: 'bg-green-200 text-green-900 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-transparent',
    DELETE:
      'bg-red-200 text-red-900 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-transparent',
    DEFAULT:
      'bg-orange-200 text-orange-900 border-orange-300 dark:bg-orange-900/50 dark:text-orange-300 dark:border-transparent',
  };

  const CATEGORY_STYLES = {
    backend:
      'bg-emerald-200 text-emerald-900 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-transparent',
    frontend:
      'bg-indigo-200 text-indigo-900 border-indigo-300 dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-transparent',
    infrastructure:
      'bg-teal-200 text-teal-900 border-teal-300 dark:bg-teal-900/50 dark:text-teal-300 dark:border-transparent',
  };

  const TYPE_STYLES = {
    role: 'bg-purple-200 text-purple-900 border-purple-300 dark:bg-purple-900/50 dark:text-purple-300 dark:border-transparent',
    type: 'bg-sky-200 text-sky-900 border-sky-300 dark:bg-sky-900/50 dark:text-sky-300 dark:border-transparent',
    behavior:
      'bg-rose-200 text-rose-900 border-rose-300 dark:bg-rose-900/50 dark:text-rose-300 dark:border-transparent',
  };

  let styles = DEFAULT;

  if (type === 'method') {
    styles = METHOD_STYLES[label] || METHOD_STYLES.DEFAULT;
  } else if (type === 'category') {
    styles = CATEGORY_STYLES[label] || DEFAULT;
  } else if (TYPE_STYLES[type]) {
    styles = TYPE_STYLES[type];
  }

  return <span className={`${base} ${styles}`}>{label}</span>;
}
