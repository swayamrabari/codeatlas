import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  memo,
  useDeferredValue,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { projectAPI } from '../services/api';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  File,
  FileText,
  FolderClosed,
  FolderOpen,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CodeBlock } from 'react-code-block';
import { codeTheme } from '../lib/codeTheme';
import { useTheme } from '../contexts/ThemeContext';
import { themes } from 'prism-react-renderer';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Spinner } from '@/components/ui/spinner';
import {
  buildProjectTabStateKey,
  usePersistentState,
} from '@/hooks/usePersistentState';

function getLanguage(filePath) {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  // return extension not full extension to language mapping, default to plaintext
  return ext;
}

const MAX_DISPLAY_FILE_SIZE = 512 * 1024; // 512KB - avoid rendering huge files as code
const MAX_SYNTAX_HIGHLIGHT_SIZE = 128 * 1024; // Avoid expensive tokenization for large files

export default function Source({ projectId, isPublic = false }) {
  const selectedFileStorageKey = buildProjectTabStateKey(
    projectId,
    'source',
    'selected-file-path',
  );
  const [selectedFilePath, setSelectedFilePath] = usePersistentState(
    selectedFileStorageKey,
    null,
  );
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [selectedFileSummary, setSelectedFileSummary] = useState('');
  const [isPreviewReady, setIsPreviewReady] = useState(false);

  // useTheme
  const { theme } = useTheme();

  const {
    data: resData,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ['sourceFileList', projectId, isPublic ? 'public' : 'private'],
    queryFn: () =>
      isPublic
        ? projectAPI.getPublicSourceFileList(projectId)
        : projectAPI.getSourceFileList(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const data = resData?.data;
  const deferredData = useDeferredValue(data);
  const isPreparingData = !!data && deferredData !== data;
  const error = queryError?.message ? 'Failed to load project data.' : null;

  const processedFiles = useMemo(() => {
    const files = Array.isArray(deferredData)
      ? deferredData
      : deferredData?.files;
    if (!files?.length) return [];
    return files.map((f) => ({
      ...f,
      path: (f.path || '').replace(/\\/g, '/'),
    }));
  }, [deferredData]);

  const selectedFile = useMemo(() => {
    if (!selectedFilePath) return null;
    return processedFiles.find((f) => f.path === selectedFilePath) || null;
  }, [processedFiles, selectedFilePath]);

  const fileTree = useMemo(() => {
    if (!processedFiles.length) return [];
    return buildFileTree(processedFiles);
  }, [processedFiles]);

  const {
    data: fileRes,
    isLoading: fileContentLoading,
    error: fileQueryError,
  } = useQuery({
    queryKey: [
      'fileContent',
      projectId,
      selectedFile?.path,
      isPublic ? 'public' : 'private',
    ],
    queryFn: ({ signal }) =>
      isPublic
        ? projectAPI.getPublicSourceFileContent(
            projectId,
            selectedFile.path,
            signal,
          )
        : projectAPI.getSourceFileContent(projectId, selectedFile.path, signal),
    enabled: !!projectId && !!selectedFile?.path,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const fileContentRaw = fileRes?.content ?? fileRes?.data?.content ?? '';
  const fileOk = fileRes?.success !== false;

  let fileContentError = null;
  let fileContent = '';

  if (fileQueryError) {
    fileContentError = fileQueryError.message || 'Failed to load file content.';
  } else if (fileRes && !fileOk) {
    fileContentError = 'Could not load file.';
  } else if (fileRes && typeof fileContentRaw !== 'string') {
    fileContentError = 'File is not text.';
  } else if (fileContentRaw.length > MAX_DISPLAY_FILE_SIZE) {
    fileContentError = `File is too large to display (${(fileContentRaw.length / 1024).toFixed(0)} KB).`;
  } else if (fileRes) {
    fileContent = fileContentRaw || 'No content';
  }

  // Update selected file summary when the detailed API pulls it
  useEffect(() => {
    if (fileRes) {
      const summary =
        fileRes?.file?.aiDocumentation?.shortSummary ??
        fileRes?.data?.file?.aiDocumentation?.shortSummary ??
        '';
      if (summary) setSelectedFileSummary(summary);
    }
  }, [fileRes]);

  useEffect(() => {
    if (!selectedFile) {
      if (isPreparingData) return;
      setSelectedFileSummary('');
      return;
    }

    setSelectedFileSummary(selectedFile?.aiDocumentation?.shortSummary || '');
  }, [selectedFile, isPreparingData]);

  useEffect(() => {
    if (!selectedFilePath || !processedFiles.length) return;
    const stillExists = processedFiles.some((f) => f.path === selectedFilePath);
    if (!stillExists) {
      setSelectedFilePath(null);
    }
  }, [processedFiles, selectedFilePath, setSelectedFilePath]);

  const handleSelectFile = useCallback(
    (fileData) => {
      setSelectedFilePath(fileData?.path || null);
      setSelectedFileSummary(fileData?.aiDocumentation?.shortSummary || '');
    },
    [setSelectedFilePath],
  );

  useEffect(() => {
    setSummaryDialogOpen(false);
  }, [selectedFile?.path]);

  useEffect(() => {
    if (!selectedFile?.path) {
      setIsPreviewReady(false);
      return;
    }

    setIsPreviewReady(false);
    let timeoutId = null;
    const rafId = window.requestAnimationFrame(() => {
      timeoutId = window.setTimeout(() => {
        setIsPreviewReady(true);
      }, 0);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [selectedFile?.path]);

  const shouldUsePlainTextPreview =
    !!fileContent && fileContent.length > MAX_SYNTAX_HIGHLIGHT_SIZE;

  if (loading || isPreparingData) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Spinner className="h-8 w-8" />
          <p className="text-sm font-medium">{isPreparingData ? 'Preparing source view…' : 'Loading project files…'}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-destructive">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* LEFT: FILE TREE */}
        <div className="flex h-full min-h-0 w-80 flex-col overflow-hidden border-r bg-muted/5">
          <ScrollArea className="h-full flex-1">
            <div className="flex-1 w-full max-w-[320px] overflow-hidden p-2 pb-20">
              {fileTree.length === 0 ? (
                <div className="grid flex-1 w-full place-items-center text-center text-sm text-muted-foreground">
                  No files in this project.
                </div>
              ) : (
                <FileTree
                  items={fileTree}
                  onSelect={handleSelectFile}
                  selectedPath={selectedFilePath}
                />
              )}
            </div>
          </ScrollArea>
        </div>

        {/* RIGHT: SOURCE CODE VIEWER */}
        <div className="flex flex-1 min-h-0 h-full flex-col overflow-hidden">
          {selectedFile && (
            <div className="border-b bg-muted/5 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="flex items-center font-mono gap-2 text-lg font-bold leading-tight">
                    {selectedFile.path.split('/').pop()}
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {selectedFile.type}
                    </Badge>
                  </h2>
                  <p className="truncate font-mono text-sm text-muted-foreground">
                    {selectedFile.path}
                  </p>
                </div>

                <Dialog
                  open={summaryDialogOpen}
                  onOpenChange={setSummaryDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="shrink-0"
                    >
                      <Sparkles className="h-5 w-5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-xl">
                    <DialogHeader className="flex flex-col gap-1">
                      <DialogTitle>Summary</DialogTitle>
                      <DialogDescription className="font-mono text-base break-all">
                        {selectedFile.path}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="text-[15px] leading-relaxed [&_code]:bg-muted [&_code]:px-1.5 [&_code]:pt-0 [&_code]:pb-0.5 [&_code]:text-[0.85rem] [&_code]:border [&_code]:border-border [&_code]:rounded">
                      {selectedFileSummary ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {selectedFileSummary}
                        </ReactMarkdown>
                      ) : (
                        <p className="text-muted-foreground">
                          No summary available for this file.
                        </p>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          )}
          <ScrollArea
            className="flex-1 min-h-0 bg-background"
            showHorizontalScrollbar
          >
            <div className="flex flex-1 w-full flex-col">
              {!selectedFile ? (
                <div className="grid flex-1 w-full place-items-center px-4">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <File className="mb-2 h-12 w-12 stroke-[1.75px]" />
                    <p className="text-lg font-semibold">
                      Select a file to view source code
                    </p>
                  </div>
                </div>
              ) : fileContentLoading ? (
                <div className="grid flex-1 w-full place-items-center px-4">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Spinner className="h-8 w-8" />
                    <p className="text-sm font-medium">Loading file content…</p>
                  </div>
                </div>
              ) : fileContentError ? (
                <div className="grid flex-1 w-full place-items-center p-4">
                  <div className="flex flex-col items-center gap-3 text-destructive">
                    <AlertCircle className="h-8 w-8" />
                    <p className="text-sm font-medium">{fileContentError}</p>
                  </div>
                </div>
              ) : !isPreviewReady ? (
                <div className="grid flex-1 w-full place-items-center px-4">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Spinner className="h-8 w-8" />
                    <p className="text-sm font-medium">Preparing source preview…</p>
                  </div>
                </div>
              ) : shouldUsePlainTextPreview ? (
                <div className="w-full min-w-max">
                  <div className="border-b bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
                    Large file detected. Showing plain text preview for smooth
                    navigation.
                  </div>
                  <pre className="px-4 py-3 pb-20 text-sm leading-6 whitespace-pre font-mono">
                    {fileContent}
                  </pre>
                </div>
              ) : (
                <div className="explorer-code-block w-full min-w-max">
                  <CodeBlock
                    code={fileContent}
                    theme={theme === 'light' ? themes.vsLight : codeTheme}
                    language={getLanguage(selectedFile.path)}
                  >
                    <CodeBlock.Code className="px-4 py-3 pb-20 text-base min-w-max">
                      <div className="table w-full min-w-max">
                        <CodeBlock.LineContent className="table-row whitespace-pre">
                          <CodeBlock.LineNumber className="table-cell w-10 pr-5 text-right text-muted-foreground/80 select-none align-middle" />
                          <CodeBlock.Token />
                        </CodeBlock.LineContent>
                      </div>
                    </CodeBlock.Code>
                  </CodeBlock>
                </div>
              )}
            </div>
          </ScrollArea>
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

const FileTreeItem = memo(function FileTreeItem({
  item,
  onSelect,
  selectedPath,
  level,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isSelected = selectedPath === item.path;

  useEffect(() => {
    if (
      item.type === 'folder' &&
      selectedPath &&
      selectedPath.startsWith(`${item.path}/`)
    ) {
      setIsOpen(true);
    }
  }, [item.path, item.type, selectedPath]);

  const handleClick = (e) => {
    e.stopPropagation();
    if (item.type === 'folder') {
      setIsOpen((prev) => !prev);
    } else {
      onSelect(item.fileData);
    }
  };

  return (
    <div className="max-w-full overflow-hidden">
      <div
        className={`flex my-px cursor-pointer select-none items-center gap-1.5 overflow-hidden rounded py-1 font-mono text-sm ${
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
});
