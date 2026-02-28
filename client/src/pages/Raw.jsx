import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { projectAPI } from '../services/api';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  File,
  FolderClosed,
  FolderOpen,
  Box,
  PanelTopClose,
  PanelTopOpen,
  Layers,
  FileCode,
  Share2,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Raw({ projectId }) {
  const { state } = useLocation();
  const [data, setData] = useState(state?.data?.data || null);
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [sidebarTab, setSidebarTab] = useState('files');
  const [summryOpen, setSummryOpen] = useState(true);

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
    }
  }, [projectId, data]);

  // ---------------- DATA PREPROCESSING ----------------
  const { processedFiles, fileTree, frameworksList, featuresList } =
    useMemo(() => {
      if (!data)
        return {
          processedFiles: [],
          fileTree: [],
          frameworksList: [],
          featuresList: [],
        };

      const fwList = [];
      if (data.frameworks) {
        console.log('Raw data frameworks:', data.frameworks);
        Object.values(data.frameworks).forEach((list) => {
          if (Array.isArray(list)) fwList.push(...list);
        });
      }

      const processed =
        data.files?.map((f) => ({
          ...f,
          path: f.path.replace(/\\/g, '/'),
        })) || [];

      const tree = buildFileTree(processed);

      // Build features list from data.features (object keyed by keyword)
      const features = data.features
        ? Object.entries(data.features)
            .map(([keyword, feat]) => ({ keyword, ...feat }))
            .sort((a, b) => a.name.localeCompare(b.name))
        : [];

      return {
        processedFiles: processed,
        fileTree: tree,
        frameworksList: [...new Set(fwList)],
        featuresList: features,
      };
    }, [data]);

  // When switching sidebar tabs, clear the opposite selection
  const handleSidebarTabChange = (tab) => {
    setSidebarTab(tab);
    if (tab === 'files') {
      setSelectedFeature(null);
    } else {
      setSelectedFile(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Loading analysis data...</p>
        </div>
      </div>
    );
  }

  if (error) return <div className="p-8 text-destructive">{error}</div>;
  if (!data) return null;

  return (
    <div className="h-full relative bg-background flex flex-col overflow-hidden">
      {/* abosulte button to open totoggle summary ribbon */}
      <Button
        className="absolute top-5 right-4 z-10"
        variant="secondary"
        size="icon"
        onClick={() => setSummryOpen(!summryOpen)}
      >
        {summryOpen ? (
          <PanelTopClose className="h-4 w-4" />
        ) : (
          <PanelTopOpen className="h-4 w-4" />
        )}
      </Button>
      <div
        className={`summary-ribbon px-5 shrink-0 overflow-hidden ${summryOpen ? 'max-h-96 py-6  border-b' : 'max-h-0 py-0 border-0'}`}
      >
        <div className="flex flex-wrap items-center gap-6 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-secondary rounded-lg">
              <Box className="h-6 w-6 text-primary" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-muted-foreground">
                Project Type
              </p>
              <p className="text-lg font-bold capitalize leading-none">
                {data.projectType || 'Unknown'}
              </p>
            </div>
          </div>

          <div className="h-12 w-0.5 bg-border" />

          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-secondary rounded-lg">
              <File className="h-6 w-6 text-primary" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-muted-foreground">
                Total Files
              </p>
              <p className="text-lg font-bold leading-none">
                {processedFiles.length}
              </p>
            </div>
          </div>

          <div className="h-12 w-0.5 bg-border" />

          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-secondary rounded-lg">
              <Share2 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-muted-foreground">
                Total Relationships
              </p>
              <p className="text-lg font-bold leading-none">
                {data.relationshipStats?.totalRelationships ?? '—'}
              </p>
            </div>
          </div>

          <div className="h-12 w-0.5 bg-border" />

          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-secondary rounded-lg">
              <Layers className="h-6 w-6 text-primary" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-muted-foreground">
                Features Detected
              </p>
              <p className="text-lg font-bold leading-none">
                {featuresList.length}
              </p>
            </div>
          </div>

          <div className="h-12 w-0.5 bg-border" />

          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-secondary rounded-lg">
              <FileCode className="h-6 w-6 text-primary" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-muted-foreground">
                File Types
              </p>
              <p className="text-lg font-bold leading-none">
                {
                  new Set(processedFiles.map((f) => f.type).filter(Boolean))
                    .size
                }
              </p>
            </div>
          </div>
        </div>

        {/* ONE ROW FRAMEWORKS CARD */}
        <div className="mt-6">
          <span className="text-base mb-2 font-semibold text-muted-foreground">
            Frameworks Detected
          </span>
          {frameworksList.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2">
              {frameworksList.map((fw) => (
                <Badge
                  key={fw}
                  variant={'secondary'}
                  className="text-xs uppercase rounded-md font-semibold px-3 pt-1.5 pb-1.25 whitespace-nowrap"
                >
                  {fw}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* badges with total number of file type counts */}
        <div className="mt-6">
          <span className="text-base mb-4 font-semibold text-muted-foreground">
            File Types Breakdown
          </span>
          <div className="flex items-center gap-2 flex-wrap pt-2">
            {Array.from(
              new Set(processedFiles.map((f) => f.type).filter(Boolean)),
            ).map((type) => {
              const count = processedFiles.filter(
                (f) => f.type === type,
              ).length;
              return (
                <Badge
                  key={type}
                  variant={'outline'}
                  className="text-xs bg-accent rounded-md uppercase font-semibold px-3 pt-1.5 pb-1.25"
                >
                  {type}
                  <span className="ml-1 text-muted-foreground">{count}</span>
                </Badge>
              );
            })}
          </div>
        </div>
      </div>
      {/* BOTTOM: SPLIT VIEW (SIDEBAR | DETAILS) */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: TABBED SIDEBAR (Files / Features) */}
        <div className="w-80 border-r bg-muted/5 flex flex-col h-full overflow-hidden">
          <Tabs
            value={sidebarTab}
            onValueChange={handleSidebarTabChange}
            className="flex flex-col h-full"
          >
            <div className="p-2 pb-0">
              <TabsList className="w-full" variant="line">
                <TabsTrigger value="files">Files</TabsTrigger>
                <TabsTrigger value="features">
                  Features
                  {featuresList.length > 0 && (
                    <Badge className="ml-1 h-4.5 min-w-5 px-1.5 text-[10px] font-semibold">
                      {featuresList.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="files" className="flex-1 overflow-hidden mt-0">
              <ScrollArea className="h-full">
                <div className="p-2 pt-0 pb-20 max-w-[320px] overflow-hidden">
                  <FileTree
                    items={fileTree}
                    onSelect={setSelectedFile}
                    selectedPath={selectedFile?.path}
                  />
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent
              value="features"
              className="flex-1 overflow-hidden mt-0"
            >
              <ScrollArea className="h-full">
                <div className="p-2 pt-0 pb-20">
                  {featuresList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Layers className="h-8 w-8 mb-2" />
                      <p className="text-sm">No features detected</p>
                    </div>
                  ) : (
                    <FeatureList
                      features={featuresList}
                      onSelect={setSelectedFeature}
                      selectedKeyword={selectedFeature?.keyword}
                    />
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* RIGHT: DETAILS PANE (file or feature) */}
        <div className="flex-1 bg-background h-full overflow-auto flex flex-col">
          <div className="flex-1 flex flex-col">
            {selectedFile ? (
              <div className="w-full">
                <FileDetails file={selectedFile} />
              </div>
            ) : selectedFeature ? (
              <div className="w-full">
                <FeatureDetails feature={selectedFeature} />
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                  {sidebarTab === 'features' ? (
                    <>
                      <Layers className="h-12 w-12 mb-2 stroke-[1.75px]" />
                      <p className="text-lg font-semibold">
                        Select a feature to view details
                      </p>
                    </>
                  ) : (
                    <>
                      <File className="h-12 w-12 mb-2 stroke-[1.75px]" />
                      <p className="text-lg font-semibold">
                        Select a file to view detailed analysis
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function buildFileTree(files) {
  const root = [];
  files.forEach((file) => {
    const parts = file.path.split('/');
    let currentLevel = root;
    let currentPath = '';

    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isFile = index === parts.length - 1;

      let existing = currentLevel.find((i) => i.name === part);

      if (!existing) {
        const newItem = {
          name: part,
          path: currentPath,
          type: isFile ? 'file' : 'folder',
          children: [],
          fileData: isFile ? file : null,
        };
        currentLevel.push(newItem);
        existing = newItem;
      }

      if (!isFile) {
        currentLevel = existing.children;
      }
    });
  });

  const sortItems = (items) => {
    items.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'folder' ? -1 : 1;
    });
    items.forEach((i) => {
      if (i.children.length > 0) sortItems(i.children);
    });
    return items;
  };

  return sortItems(root);
}

function FileTree({ items, onSelect, selectedPath, level = 0 }) {
  return (
    <div className="space-y-0.5 w-full">
      {items.map((item) => (
        <FileTreeItem
          key={item.path}
          item={item}
          onSelect={onSelect}
          selectedPath={selectedPath}
          level={level}
        />
      ))}
    </div>
  );
}

function FileTreeItem({ item, onSelect, selectedPath, level }) {
  const [isOpen, setIsOpen] = useState(false);
  const isSelected = selectedPath === item.path;

  const handleClick = (e) => {
    e.stopPropagation();
    if (item.type === 'folder') {
      setIsOpen(!isOpen);
    } else {
      onSelect(item.fileData);
    }
  };

  return (
    <div className="max-w-full overflow-hidden">
      <div
        className={`
          flex items-center gap-1.5 py-1.5 rounded-md cursor-pointer select-none text-sm transition-colors font-mono overflow-hidden
          ${isSelected ? 'bg-secondary text-foreground' : 'hover:bg-secondary/70 text-foreground'}
        `}
        style={{
          paddingLeft: `${level * 14 + 8}px`,
          paddingRight: '8px',
          width: '100%',
          boxSizing: 'border-box',
        }}
        onClick={handleClick}
      >
        <span className="shrink-0 text-muted-foreground">
          {item.type === 'folder' ? (
            isOpen ? (
              <FolderOpen className="h-5 w-5" />
            ) : (
              <FolderClosed className="h-5 w-5" />
            )
          ) : (
            <File className="h-4.75 w-4.75" />
          )}
        </span>
        <span className="truncate min-w-0 flex-1">{item.name}</span>
      </div>

      {item.type === 'folder' && isOpen && (
        <FileTree
          items={item.children}
          onSelect={onSelect}
          selectedPath={selectedPath}
          level={level + 1}
        />
      )}
    </div>
  );
}

// ---------------- FEATURE LIST COMPONENT ----------------

function FeatureList({ features, onSelect, selectedKeyword }) {
  return (
    <div className="space-y-1">
      {features.map((feat) => {
        const isSelected = selectedKeyword === feat.keyword;
        return (
          <div
            key={feat.keyword}
            className={`
              flex items-center gap-2.5 px-3 py-2.5 rounded-md cursor-pointer select-none transition-colors
              ${isSelected ? 'bg-secondary text-foreground' : 'hover:bg-secondary/70 text-foreground'}
            `}
            onClick={() => onSelect(feat)}
          >
            <div className="flex-1 min-w-0">
              <p className="capitalize font-semibold truncate">{feat.name}</p>
              <p className="text-xs text-muted-foreground font-semibold">
                {feat.fileCount} files
                {feat.apiRoutes?.length > 0 &&
                  ` · ${feat.apiRoutes.length} routes`}
              </p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </div>
        );
      })}
    </div>
  );
}

// ---------------- FEATURE DETAILS COMPONENT ----------------

function FeatureDetails({ feature }) {
  const categorized = feature.categorized || {};
  const sharedDeps = feature.sharedDependencies || [];

  // Build sections from categorized data, only show non-empty ones
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
    <div className="mx-auto space-y-10 animate-in fade-in duration-300 p-20">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3 capitalize">
          {feature.name}
        </h1>
        <p className="text-muted-foreground text-base font-semibold">
          {feature.fileCount} core files
          {sharedDeps.length > 0 &&
            ` + ${sharedDeps.length} shared dependencies`}
        </p>
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

// ---------------- FILE DETAILS COMPONENT ----------------

function FileDetails({ file }) {
  return (
    <div className="mx-auto space-y-10 animate-in fade-in duration-300 p-20">
      {/* HEADER */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-3 break-all">
          <File className="h-8 w-8 text-primary" />
          {file.path.split('/').pop()}
        </h1>
        <p className="text-muted-foreground font-mono text-base">{file.path}</p>

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
      {/* 1. ROUTES SECTION */}
      {file.routes && file.routes.length > 0 && (
        <section className="space-y-4">
          <SectionHeader title="API Routes" />
          <div className="space-y-2">
            {file.routes.map((r, i) => (
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
      {/* 2. STATS & CONNECTIONS */}
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
            <div className="text-sm  font-semibold text-muted-foreground">
              Exports
            </div>
            <div className="text-2xl font-bold">{file.exportsCount || 0}</div>
          </div>
        </div>
      </section>
      {/* 3. IMPORTS LIST */}
      {file.imports?.items?.length > 0 && (
        <section className="space-y-2">
          <SectionHeader title="Imports" />
          <div className="space-y-1.5 overflow-auto pb-3">
            {file.imports.items.map((imp, i) => {
              const names = Array.isArray(imp.imported)
                ? imp.imported.filter((n) => n && n !== '(default)')
                : imp.imported
                  ? [imp.imported]
                  : [];
              const hasNames = names.length > 0;

              return (
                <div
                  key={i}
                  className="flex items-center gap-2 text-base text-foreground cursor-pointer"
                >
                  {hasNames ? (
                    <>
                      <span className="font-mono text-foreground shrink-0">
                        {names.join(', ')}
                      </span>
                      <span className="text-muted-foreground shrink-0">-</span>
                      <span className="text-muted-foreground font-mono">
                        {imp.path}
                      </span>
                    </>
                  ) : (
                    <span className="font-mono text-muted-foreground">
                      {imp.path}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
      {/* 4. EXPORTS LIST */}
      {file.exports && file.exports.length > 0 && (
        <section className="space-y-2">
          <SectionHeader title="Exports" />
          <div className="space-y-2">
            {file.exports.map((exp, i) => (
              <div key={i} className="flex items-center gap-3">
                <Badge
                  variant="secondary"
                  className="text-[12px] h-5 min-w-12 justify-center px-2 font-mono text-muted-foreground/70 border-border/50 transition-colors"
                >
                  {exp.kind}
                </Badge>
                <span className="font-mono text-base truncate">{exp.name}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      {/* also display file used by which has files in importedBy array */}
      {file.importedBy && file.importedBy.length > 0 && (
        <section className="space-y-2">
          <SectionHeader title="Imported By" />
          <div className="space-y-1">
            {file.importedBy.map((imp, i) => (
              <div
                key={i}
                className="font-mono text-base text-foreground truncate cursor-pointer"
              >
                {imp}
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
