import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { projectAPI } from '../services/api';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileDetails } from '@/components/FileDetails';
import { File, FolderClosed, FolderOpen } from 'lucide-react';

export default function Files({ projectId }) {
  const [selectedFile, setSelectedFile] = useState(null);

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
