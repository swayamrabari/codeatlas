import { useState, useEffect, useMemo, useRef, useId } from 'react';
import { projectAPI } from '../services/api';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';
import {
  BookOpen,
  Layers,
  FileText,
  ChevronRight,
  ChevronDown,
  File,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

// ── Mermaid Init ──
mermaid.initialize({
  handDrawnSeed: 42,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'inherit',
  themeVariables: {
    secondaryColor: '#3b82f6', // Tailwind blue-500
    edgeLabelBackground: '#141414',
  },
});

export default function Docs({ projectId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selection: { type: 'project' | 'feature' | 'file', key: string }
  const [selected, setSelected] = useState({
    type: 'project',
    key: 'overview',
  });

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    projectAPI
      .getProjectDocs(projectId)
      .then((res) => {
        console.log('📄 Full documentation object:', res.data);
        setData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load docs:', err);
        setError('Failed to load documentation.');
        setLoading(false);
      });
  }, [projectId]);

  // Build sidebar items
  const { projectInfo, features } = useMemo(() => {
    if (!data) return { projectInfo: null, features: [] };
    return {
      projectInfo: data.project,
      features: data.features || [],
    };
  }, [data]);

  // Get currently selected content
  const selectedContent = useMemo(() => {
    if (!data) return null;
    if (selected.type === 'project') {
      return {
        type: 'project',
        name: projectInfo?.name || 'Project',
        projectType: projectInfo?.projectType,
        frameworks: projectInfo?.frameworks,
        totalFiles: projectInfo?.totalFiles,
        featureCount: projectInfo?.featureCount,
        docs: projectInfo?.aiDocumentation || {},
      };
    }
    if (selected.type === 'feature') {
      const feat = features.find((f) => f.keyword === selected.key);
      if (!feat) return null;
      return {
        type: 'feature',
        name: feat.name,
        keyword: feat.keyword,
        fileCount: feat.fileCount,
        docs: feat.aiDocumentation || {},
      };
    }
    if (selected.type === 'file') {
      // Use featureKeyword to look in the exact feature first (handles shared files)
      const searchFeatures = selected.featureKeyword
        ? [
            features.find((f) => f.keyword === selected.featureKeyword),
            ...features.filter((f) => f.keyword !== selected.featureKeyword),
          ].filter(Boolean)
        : features;
      for (const feat of searchFeatures) {
        const file = feat.files?.find((f) => f.path === selected.key);
        if (file) {
          return {
            type: 'file',
            name: file.path.split('/').pop(),
            path: file.path,
            role: file.role,
            category: file.category,
            tier: file.tier,
            docs: file.aiDocumentation || {},
          };
        }
      }
      return null;
    }
    return null;
  }, [data, selected, projectInfo, features]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading documentation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-destructive">
          <AlertCircle className="h-8 w-8" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const hasDocs = projectInfo?.aiDocumentation?.detailedSummary;

  // ── Regenerate handler ──
  const handleRegenerate = async (type, key) => {
    try {
      let res;
      if (type === 'project') {
        res = await projectAPI.regenerateProjectDoc(projectId);
      } else if (type === 'feature') {
        res = await projectAPI.regenerateFeatureDoc(projectId, key);
      } else if (type === 'file') {
        res = await projectAPI.regenerateFileDoc(projectId, key);
      }

      if (!res?.success) throw new Error('Regeneration failed');

      // Update local state in-place
      setData((prev) => {
        if (!prev) return prev;
        const next = JSON.parse(JSON.stringify(prev));
        if (type === 'project') {
          next.project.aiDocumentation = res.data.aiDocumentation;
        } else if (type === 'feature') {
          const feat = next.features.find((f) => f.keyword === key);
          if (feat) feat.aiDocumentation = res.data.aiDocumentation;
        } else if (type === 'file') {
          for (const feat of next.features) {
            const file = feat.files?.find((f) => f.path === key);
            if (file) {
              file.aiDocumentation = res.data.aiDocumentation;
              break;
            }
          }
        }
        return next;
      });

      return true;
    } catch (err) {
      console.error('Regenerate failed:', err);
      return false;
    }
  };

  return (
    <div className="h-full flex overflow-hidden bg-background">
      <div className="flex h-full min-h-0 w-80 flex-col overflow-hidden border-r bg-muted/5">
        <ScrollArea className="h-full flex-1">
          <div className="max-w-[320px] overflow-hidden p-2 pb-20 space-y-0.5">
            {/* Project Overview */}
            <DocSidebarItem
              label="Project Overview"
              isSelected={selected.type === 'project'}
              onClick={() => setSelected({ type: 'project', key: 'overview' })}
            />

            {/* Features */}
            {features.length > 0 && (
              <div className="pt-3">
                <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Features ({features.length})
                </p>
                {features.map((feat) => (
                  <FeatureSidebarItem
                    key={feat.keyword}
                    feature={feat}
                    selected={selected}
                    onSelectFeature={() =>
                      setSelected({ type: 'feature', key: feat.keyword })
                    }
                    onSelectFile={(path, featureKeyword) =>
                      setSelected({ type: 'file', key: path, featureKeyword })
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ── RIGHT CONTENT PANE ── */}
      <div className="flex-1 h-full overflow-auto">
        {!hasDocs &&
        !selectedContent?.docs?.shortSummary &&
        !selectedContent?.docs?.detailedSummary ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <BookOpen className="h-12 w-12 stroke-[1.5px]" />
              <p className="text-lg font-semibold">
                No documentation generated yet
              </p>
              <p className="text-sm">
                Documentation will appear here after the AI pipeline completes.
              </p>
            </div>
          </div>
        ) : selectedContent ? (
          <ContentPane
            content={selectedContent}
            onRegenerate={handleRegenerate}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <p>Select an item from the sidebar</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sidebar Item (Project Overview row) ── */
function DocSidebarItem({ label, isSelected, onClick }) {
  return (
    <div
      className={`flex cursor-pointer select-none items-center gap-1.5 overflow-hidden rounded py-1.5 font-mono text-sm transition-colors ${
        isSelected
          ? 'bg-secondary text-foreground'
          : 'hover:bg-secondary/70 text-foreground'
      }`}
      style={{ paddingLeft: '8px', paddingRight: '8px' }}
      onClick={onClick}
    >
      <span className="shrink-0 text-muted-foreground">
        <BookOpen className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </div>
  );
}

/* ── Feature Sidebar Item ── */
function FeatureSidebarItem({
  feature,
  selected,
  onSelectFeature,
  onSelectFile,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isFeatureSelected =
    selected.type === 'feature' && selected.key === feature.keyword;
  const hasFileSelected =
    selected.type === 'file' &&
    selected.featureKeyword === feature.keyword &&
    feature.files?.some((f) => f.path === selected.key);

  // Auto-expand when a file inside is selected
  useEffect(() => {
    if (hasFileSelected) setIsOpen(true);
  }, [hasFileSelected]);

  return (
    <div className="max-w-full overflow-hidden">
      {/* Feature row */}
      <div
        className={`flex cursor-pointer select-none items-center gap-1.5 overflow-hidden rounded py-1.5 font-mono text-sm transition-colors ${
          isFeatureSelected
            ? 'bg-secondary text-foreground'
            : 'hover:bg-secondary/70 text-foreground'
        }`}
        style={{ paddingLeft: '8px', paddingRight: '8px' }}
        onClick={onSelectFeature}
      >
        {/* Chevron — toggle only */}
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
        <span className="min-w-0 flex-1 truncate capitalize">
          {feature.name}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {feature.fileCount}
        </span>
      </div>

      {/* Files under feature */}
      {isOpen && feature.files?.length > 0 && (
        <div>
          {feature.files.map((file) => (
            <div
              key={file.path}
              className={`flex cursor-pointer select-none items-center gap-1.5 overflow-hidden rounded py-1.5 font-mono text-sm transition-colors ${
                selected.type === 'file' &&
                selected.key === file.path &&
                selected.featureKeyword === feature.keyword
                  ? 'bg-secondary text-foreground'
                  : 'hover:bg-secondary/70 text-foreground'
              }`}
              style={{ paddingLeft: `${14 + 8}px`, paddingRight: '8px' }}
              onClick={() => onSelectFile(file.path, feature.keyword)}
            >
              <span className="shrink-0 text-muted-foreground">
                <File className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate">
                {file.path.split('/').pop()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Content Pane ── */
function ContentPane({ content, onRegenerate }) {
  const { type, docs } = content;
  const [regenerating, setRegenerating] = useState(false);

  const handleRegenClick = async () => {
    setRegenerating(true);
    const key =
      type === 'project'
        ? null
        : type === 'feature'
          ? content.keyword
          : content.path;
    await onRegenerate(type, key);
    setRegenerating(false);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-10 animate-in fade-in duration-300 p-10 md:p-16 lg:p-20">
      {/* Header */}
      <div className="space-y-3">
        {type === 'project' && (
          <>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/20 rounded-lg">
                <BookOpen className="h-7 w-7 text-blue-500" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-foreground">
                  {content.name}
                </h1>
                <p className="text-muted-foreground text-sm font-medium">
                  Project Overview
                </p>
              </div>
            </div>
          </>
        )}

        {type === 'feature' && (
          <>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/20 rounded-lg">
                <Layers className="h-7 w-7 text-blue-500" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-foreground capitalize">
                  {content.name}
                </h1>
                <p className="text-muted-foreground text-sm font-medium">
                  Feature · {content.fileCount} files
                </p>
              </div>
            </div>
          </>
        )}

        {type === 'file' && (
          <>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/20 rounded-lg">
                <File className="h-7 w-7 text-blue-500" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-foreground">
                  {content.name}
                </h1>
                <p className="text-muted-foreground text-sm font-mono">
                  {content.path}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {content.role && (
                <Badge className="text-xs px-2.5 py-1.5 rounded-md uppercase font-semibold bg-purple-200 text-purple-900 dark:bg-purple-900/40 dark:text-purple-300 border-0">
                  {content.role}
                </Badge>
              )}
              {content.category && (
                <Badge className="text-xs px-2.5 py-1.5 rounded-md uppercase font-semibold bg-emerald-200 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-300 border-0">
                  {content.category}
                </Badge>
              )}
            </div>
          </>
        )}
      </div>

      {/* Short Summary */}
      {docs.shortSummary && (
        <section className="space-y-2">
          <SectionHeader title="Summary" />
          <div className="docs-markdown text-foreground leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {docs.shortSummary}
            </ReactMarkdown>
          </div>
        </section>
      )}

      {/* Detailed Summary */}
      {docs.detailedSummary && (
        <section className="space-y-3">
          <SectionHeader title="Detailed Documentation" />
          <div className="docs-markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {docs.detailedSummary}
            </ReactMarkdown>
          </div>
        </section>
      )}

      {/* Mermaid Diagram */}
      {docs.mermaidDiagram && (
        <section className="space-y-3">
          <SectionHeader title="Diagram" />
          <MermaidDiagram chart={docs.mermaidDiagram} />
        </section>
      )}

      {/* Search Tags */}
      {docs.searchTags?.length > 0 && (
        <section className="space-y-3">
          <SectionHeader title="Tags" />
          <div className="flex flex-wrap gap-2">
            {docs.searchTags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-xs font-mono px-2.5 py-1 rounded-md gap-1"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {/* No docs fallback for this item */}
      {!docs.shortSummary && !docs.detailedSummary && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FileText className="h-10 w-10 mb-3 stroke-[1.5px]" />
          <p className="text-base font-medium">No documentation available</p>
          <p className="text-sm mt-1">
            {type === 'file' && content.tier === 3
              ? 'Tier 3 files only receive a short summary.'
              : 'Documentation has not been generated for this item yet.'}
          </p>
        </div>
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

/* ── Mermaid Diagram Renderer ── */

/** Sanitize common Mermaid syntax issues from LLM output */
function sanitizeMermaid(raw) {
  let s = raw.trim();
  // Remove markdown code fences if present
  s = s.replace(/^```(?:mermaid)?\n?/i, '').replace(/\n?```$/i, '');
  // Remove trailing semicolons on lines
  s = s.replace(/;\s*$/gm, '');
  // Remove HTML <br> / <br/> tags inside labels
  s = s.replace(/<br\s*\/?>/gi, ' ');
  // Fix bare -- (without >) by converting to -->
  s = s.replace(/^(\s*\S+\s*)--(?!>)(\s*\S+)/gm, '$1-->$2');
  // Ensure node IDs don't have special chars: fix common pattern like A.B[label] → A_B[label]
  s = s.replace(
    /^(\s*)([A-Za-z][A-Za-z0-9]*)[\-\.\/]([A-Za-z][A-Za-z0-9]*)(\[)/gm,
    '$1$2_$3$4',
  );
  return s;
}

function MermaidDiagram({ chart }) {
  const containerRef = useRef(null);
  const uniqueId = useId();
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!chart) return;
    let cancelled = false;

    async function render() {
      try {
        // mermaid needs a unique DOM id (no colons from useId)
        const id = `mermaid-${uniqueId.replace(/:/g, '')}`;
        const sanitized = sanitizeMermaid(chart);
        const { svg: rendered } = await mermaid.render(id, sanitized);
        if (!cancelled) {
          setSvg(rendered);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('Mermaid render failed:', err);
          setError(chart); // fallback to raw code
          setSvg('');
        }
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [chart, uniqueId]);

  if (error) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4 overflow-x-auto">
        <pre className="text-sm font-mono text-foreground whitespace-pre-wrap">
          {error}
        </pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="rounded-lg border bg-muted/30 p-6 flex items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="rounded-lg border bg-muted/30 p-4 overflow-x-auto flex items-center justify-center [&>svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
