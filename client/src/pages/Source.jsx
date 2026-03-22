import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { projectAPI } from '../services/api';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  File,
  FileText,
  FolderClosed,
  FolderOpen,
  Sparkles,
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

function getLanguage(filePath) {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  // return extension not full extension to language mapping, default to plaintext
  return ext;
}

const MAX_DISPLAY_FILE_SIZE = 512 * 1024; // 512KB - avoid rendering huge files as code

export default function Source({ projectId }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [selectedFileSummary, setSelectedFileSummary] = useState('');

  // useTheme
  const { theme } = useTheme();

  const {
    data: resData,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectAPI.getProject(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  const data = resData?.data;
  const error = queryError?.message ? 'Failed to load project data.' : null;

  const fileTree = useMemo(() => {
    if (!data?.files?.length) return [];
    const processed = data.files.map((f) => ({
      ...f,
      path: (f.path || '').replace(/\\/g, '/'),
    }));
    return buildFileTree(processed);
  }, [data]);

  const {
    data: fileRes,
    isLoading: fileContentLoading,
    error: fileQueryError,
  } = useQuery({
    queryKey: ['fileContent', projectId, selectedFile?.path],
    queryFn: ({ signal }) =>
      projectAPI.getFileContent(projectId, selectedFile.path, signal),
    enabled: !!projectId && !!selectedFile?.path,
    staleTime: 5 * 60 * 1000,
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

  const handleSelectFile = useCallback((fileData) => {
    setSelectedFile(fileData);
    setSelectedFileSummary(fileData?.aiDocumentation?.shortSummary || '');
  }, []);

  useEffect(() => {
    setSummaryDialogOpen(false);
  }, [selectedFile?.path]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading project files...</p>
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
                  onSelect={handleSelectFile}
                  selectedPath={selectedFile?.path}
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
          <div className="flex-1 min-h-0 overflow-auto bg-background flex flex-col">
            <div className="flex-1 flex flex-col">
              {!selectedFile ? (
                <div className="flex flex-1 items-center justify-center w-full">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <File className="mb-2 h-12 w-12 stroke-[1.75px]" />
                    <p className="text-lg font-semibold">
                      Select a file to view source code
                    </p>
                  </div>
                </div>
              ) : fileContentLoading ? (
                <div className="flex flex-1 items-center justify-center w-full">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : fileContentError ? (
                <div className="flex flex-1 items-center justify-center p-4 text-destructive">
                  {fileContentError}
                </div>
              ) : (
                <div className="explorer-code-block w-full min-w-0 overflow-x-auto overflow-y-auto">
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

const FileTreeItem = memo(function FileTreeItem({
  item,
  onSelect,
  selectedPath,
  level,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isSelected = selectedPath === item.path;

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
