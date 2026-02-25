import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { useLocation } from 'react-router-dom';
import { projectAPI } from '../services/api';
import { ScrollArea } from '@/components/ui/scroll-area';
import { File, FolderClosed, FolderOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CodeBlock } from 'react-code-block';
import { codeTheme } from '../lib/codeTheme';
import { useTheme } from '../contexts/ThemeContext';
import { themes } from 'prism-react-renderer';

function getLanguage(filePath) {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  // return extension not full extension to language mapping, default to plaintext
  return ext;
}

const MAX_DISPLAY_FILE_SIZE = 512 * 1024; // 512KB - avoid rendering huge files as code

export default function Explorer({ projectId }) {
  const { state } = useLocation();
  const [data, setData] = useState(state?.data?.data ?? null);
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [fileContentLoading, setFileContentLoading] = useState(false);
  const [fileContentError, setFileContentError] = useState(null);
  const fileContentAbortRef = useRef(null);

  // useTheme
  const { theme } = useTheme();

  // Load project: API returns { success, data: analysis }; we store analysis (has .files)
  useEffect(() => {
    if (!projectId) return;
    if (data) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    projectAPI
      .getProject(projectId)
      .then((response) => {
        if (cancelled) return;
        const analysis = response?.data?.data ?? response?.data ?? response;
        setData(analysis);
        setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            'Failed to load project data: ' + (err?.message || 'Unknown error'),
          );
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, data]);

  const fileTree = useMemo(() => {
    if (!data?.files?.length) return [];
    const processed = data.files.map((f) => ({
      ...f,
      path: (f.path || '').replace(/\\/g, '/'),
    }));
    return buildFileTree(processed);
  }, [data]);

  // Fetch file content with abort on change and correct response shape (res.content)
  useEffect(() => {
    if (!selectedFile?.path || !projectId) {
      setFileContent('');
      setFileContentError(null);
      setFileContentLoading(false);
      return;
    }
    if (fileContentAbortRef.current) {
      fileContentAbortRef.current.abort();
    }
    const ac = new AbortController();
    fileContentAbortRef.current = ac;
    setFileContentLoading(true);
    setFileContentError(null);

    projectAPI
      .getFileContent(projectId, selectedFile.path, ac.signal)
      .then((res) => {
        if (ac.signal.aborted) return;
        const content = res?.content ?? res?.data?.content ?? '';
        const ok = res?.success !== false;
        if (!ok) {
          setFileContentError('Could not load file.');
          setFileContent('');
        } else if (typeof content !== 'string') {
          setFileContentError('File is not text.');
          setFileContent('');
        } else if (content.length > MAX_DISPLAY_FILE_SIZE) {
          setFileContentError(
            `File is too large to display (${(content.length / 1024).toFixed(0)} KB).`,
          );
          setFileContent('');
        } else {
          setFileContent(content || 'No content');
        }
        setFileContentLoading(false);
      })
      .catch((err) => {
        if (
          ac.signal.aborted ||
          err?.name === 'CanceledError' ||
          err?.code === 'ERR_CANCELED'
        )
          return;
        setFileContentError(err?.message || 'Failed to load file content.');
        setFileContent('');
        setFileContentLoading(false);
      });

    return () => {
      ac.abort();
      if (fileContentAbortRef.current === ac)
        fileContentAbortRef.current = null;
    };
  }, [selectedFile?.path, projectId]);

  const handleSelectFile = useCallback((fileData) => {
    setSelectedFile(fileData);
  }, []);

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
    <div className="w-full space-y-0.5">
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
        className={
          isSelected
            ? 'bg-secondary text-foreground flex cursor-pointer select-none items-center gap-1.5 overflow-hidden rounded py-1.5 font-mono text-sm transition-colors'
            : 'hover:bg-secondary/70 text-foreground flex cursor-pointer select-none items-center gap-1.5 overflow-hidden rounded py-1.5 font-mono text-sm transition-colors'
        }
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
        <span className="min-w-0 flex-1 truncate">{item.name}</span>
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
});
