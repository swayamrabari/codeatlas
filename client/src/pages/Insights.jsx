import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { useQuery } from '@tanstack/react-query';
import { projectAPI } from '../services/api';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileDetails } from '@/components/FileDetails';
import { SectionHeader } from '@/components/SectionHeader';
import { TintedBadge } from '@/components/TintedBadge';
import {
  buildProjectTabStateKey,
  usePersistentState,
} from '@/hooks/usePersistentState';
import {
  Box,
  File,
  Share2,
  Layers,
  FileCode,
  BookOpen,
  ChevronRight,
  ChevronDown,
  GitGraph,
  Files,
} from 'lucide-react';

export default function Insights({ projectId, isPublic = false }) {
  const selectionStorageKey = buildProjectTabStateKey(
    projectId,
    'insights',
    'selected',
  );
  const [selected, setSelected] = usePersistentState(selectionStorageKey, {
    type: 'overview',
  });
  const activeSelection =
    selected && typeof selected === 'object' ? selected : { type: 'overview' };

  const {
    data: resData,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ['insightsPage', projectId, isPublic ? 'public' : 'private'],
    queryFn: () =>
      isPublic
        ? projectAPI.getPublicInsightsPage(projectId)
        : projectAPI.getInsightsPage(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const data = resData?.data;
  const deferredData = useDeferredValue(data);
  const isPreparingData = !!data && deferredData !== data;
  const error = queryError?.message ? 'Failed to load project data.' : null;

  const { processedFiles, frameworksList, featuresList } = useMemo(() => {
    if (!deferredData)
      return { processedFiles: [], frameworksList: [], featuresList: [] };

    const fwList = [];
    if (deferredData.frameworks) {
      Object.values(deferredData.frameworks).forEach((list) => {
        if (Array.isArray(list)) fwList.push(...list);
      });
    }

    const rawFiles = deferredData.files ?? deferredData.data?.files;
    const processed =
      rawFiles?.map((f) => ({
        ...f,
        path: f.path.replace(/\\/g, '/'),
      })) || [];

    const rawFeatures = deferredData.features ?? deferredData.data?.features;
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
  }, [deferredData]);

  const selectedFeature = useMemo(() => {
    if (activeSelection.type !== 'feature') return null;
    return featuresList.find((f) => f.keyword === activeSelection.key) || null;
  }, [activeSelection, featuresList]);

  const selectedFile = useMemo(() => {
    if (activeSelection.type !== 'file') return null;
    return processedFiles.find((f) => f.path === activeSelection.key) || null;
  }, [activeSelection, processedFiles]);

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

  if (isPreparingData) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p>Preparing insights view...</p>
        </div>
      </div>
    );
  }

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
                activeSelection.type === 'overview'
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
                    selected={activeSelection}
                    isSelected={
                      activeSelection.type === 'feature' &&
                      activeSelection.key === feat.keyword
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
      <ScrollArea className="flex-1 h-full" showHorizontalScrollbar>
        <div className="min-h-full">
          {activeSelection.type === 'overview' ? (
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
            <div className="flex min-h-full items-center justify-center text-muted-foreground">
              <p>Select an item from the sidebar</p>
            </div>
          )}
        </div>
      </ScrollArea>
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

/* ── Project Metadata Pane ── */
function ProjectMetadataPane({
  data,
  processedFiles,
  frameworksList,
  featuresList,
}) {
  return (
    <div className="mx-auto max-w-4xl space-y-10 animate-in fade-in duration-300 p-10 md:p-16 lg:p-20">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-secondary rounded-lg">
            <BookOpen className="h-8 w-8" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">
              {data.projectName}
            </h1>
            <p className="text-muted-foreground text-sm font-medium">
              Project Insights & Metadata
            </p>
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
          <StatCard
            icon={<Files className="h-8 w-8 text-primary" />}
            label="Files in Graph"
            value={data.relationshipStats?.filesInGraph ?? '—'}
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
    <div className="mx-auto max-w-4xl space-y-10 animate-in fade-in duration-300 p-10 md:p-16 lg:p-20">
      {/* HEADER */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-secondary rounded-lg">
            <Layers className="h-8 w-8" />
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
