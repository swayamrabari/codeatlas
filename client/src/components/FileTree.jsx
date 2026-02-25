import { useState } from 'react';

/**
 * Build tree structure from flat file paths
 */
function buildTree(files) {
  const root = { name: 'root', children: {}, files: [] };

  files.forEach((file) => {
    const parts = file.path.split(/[/\\]/);
    let current = root;

    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        // It's a file
        current.files.push({ ...file, name: part });
      } else {
        // It's a folder
        if (!current.children[part]) {
          current.children[part] = { name: part, children: {}, files: [] };
        }
        current = current.children[part];
      }
    });
  });

  return root;
}

function FolderNode({ name, node, depth, onSelectFile, selectedPath }) {
  const [expanded, setExpanded] = useState(depth < 2);

  const childFolders = Object.values(node.children);
  const hasChildren = childFolders.length > 0 || node.files.length > 0;

  return (
    <div style={{ marginLeft: depth > 0 ? 12 : 0 }}>
      {name !== 'root' && (
        <div
          className="flex cursor-pointer items-center gap-1 rounded px-2 py-1 hover:bg-accent hover:text-accent-foreground transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <span className="text-muted-foreground">{expanded ? '📂' : '📁'}</span>
          <span className="text-sm font-medium text-foreground">{name}</span>
        </div>
      )}

      {(expanded || name === 'root') && hasChildren && (
        <div>
          {childFolders.map((child) => (
            <FolderNode
              key={child.name}
              name={child.name}
              node={child}
              depth={depth + 1}
              onSelectFile={onSelectFile}
              selectedPath={selectedPath}
            />
          ))}
          {node.files.map((file) => (
            <FileNode
              key={file.path}
              file={file}
              depth={depth + 1}
              onSelect={onSelectFile}
              isSelected={selectedPath === file.path}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FileNode({ file, depth, onSelect, isSelected }) {
  const getIcon = (type) => {
    const icons = {
      route: '🛣️',
      controller: '🎮',
      service: '⚙️',
      model: '📊',
      component: '🧩',
      page: '📄',
      config: '⚙️',
      test: '🧪',
      utility: '🔧',
      entry: '🚀',
      middleware: '🔗',
      hook: '🪝',
      state: '📦',
      api: '🌐',
    };
    return icons[type] || '📝';
  };

  return (
    <div
      style={{ marginLeft: depth * 12 }}
      className={`flex cursor-pointer items-center gap-1 rounded px-2 py-1 transition-colors ${
        isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-accent hover:text-accent-foreground'
      }`}
      onClick={() => onSelect(file)}
    >
      <span>{getIcon(file.type)}</span>
      <span className="text-sm text-foreground">{file.name}</span>
      <span className="ml-auto text-xs text-muted-foreground">{file.type}</span>
    </div>
  );
}

export default function FileTree({ files, onSelectFile, selectedPath }) {
  const tree = buildTree(files || []);

  if (!files || files.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No files to display
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      <FolderNode
        name="root"
        node={tree}
        depth={0}
        onSelectFile={onSelectFile}
        selectedPath={selectedPath}
      />
    </div>
  );
}
