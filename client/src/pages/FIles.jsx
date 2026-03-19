import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { projectAPI } from '../services/api';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { File, FolderClosed, FolderOpen } from 'lucide-react';

export default function Files({ projectId }) {
  const { state } = useLocation();
  const [data, setData] = useState(state?.data?.data || null);
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

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
  const fileTree = useMemo(() => {
    if (!data) return [];
    const rawFiles = data.files ?? data.data?.files;
    const processed =
      rawFiles?.map((f) => ({
        ...f,
        path: f.path.replace(/\\/g, '/'),
      })) || [];

    return buildFileTree(processed);
  }, [data]);

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
    <div className="h-full flex flex-col overflow-hidden bg-background">
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* LEFT: FILE TREE */}
        <div className="flex h-full min-h-0 w-80 flex-col overflow-hidden border-r bg-muted/5">
          <ScrollArea className="h-full flex-1">
            <div className="max-w-[320px] overflow-hidden p-2 pb-20">
              {fileTree.length === 0 ? (
                <p className="p-2 text-sm text-muted-foreground">
                  No files in this project.
                </p>
              ) : (
                <FileTree
                  items={fileTree}
                  onSelect={setSelectedFile}
                  selectedPath={selectedFile?.path}
                />
              )}
            </div>
          </ScrollArea>
        </div>

        {/* RIGHT: FILE DETAILS PANE */}
        <div className="flex flex-1 min-h-0 h-full flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-auto bg-background flex flex-col">
            <div className="flex-1 flex flex-col">
              {selectedFile ? (
                <div className="w-full">
                  <FileDetails file={selectedFile} />
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <File className="h-12 w-12 mb-2 stroke-[1.75px]" />
                    <p className="text-lg font-semibold">
                      Select a file to view detailed analysis
                    </p>
                  </div>
                </div>
              )}
            </div>
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
    <div className="w-full">
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
        className={`flex cursor-pointer select-none items-center gap-1.5 overflow-hidden rounded py-1 font-mono text-sm ${
          isSelected
            ? 'bg-secondary text-foreground'
            : 'hover:bg-secondary text-foreground'
        }`}
        style={{
          paddingLeft: `${level * 18 + 10}px`,
          paddingRight: '8px',
          width: '100%',
          boxSizing: 'border-box',
        }}
        onClick={handleClick}
      >
        <span className="shrink-0 text-muted-foreground">
          {item.type === 'folder' ? (
            isOpen ? (
              <FolderOpen className="h-4 w-4" />
            ) : (
              <FolderClosed className="h-4 w-4" />
            )
          ) : (
            <File className="h-4 w-4" />
          )}
        </span>
        <span className="min-w-0 mt-0.5 flex-1 truncate">{item.name}</span>
      </div>

      {item.type === 'folder' && isOpen && (
        <div className="relative">
          <span
            className="absolute top-0 bottom-0 w-[1.5px] bg-secondary"
            style={{ left: `${level * 18 + 16}px` }}
          />
          <FileTree
            items={item.children}
            onSelect={onSelect}
            selectedPath={selectedPath}
            level={level + 1}
          />
        </div>
      )}
    </div>
  );
}

// ---------------- FILE DETAILS COMPONENT ----------------

function FileDetails({ file }) {
  return (
    <div className="mx-auto space-y-10 animate-in fade-in duration-300 p-20">
      {/* HEADER */}
      <div className="space-y-3">
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
      {/* 1. ROUTES SECTION — prefer absoluteRoutes when available */}
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

      {/* 1b. THIRD-PARTY DEPENDENCIES */}
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
            <div className="text-sm font-semibold text-muted-foreground">
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
