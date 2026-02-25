// Folders to completely skip
export const IGNORE_FOLDERS = [
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  '.output',
  '.cache',
  '.parcel-cache',
  'coverage',
  '.nyc_output',
  '__pycache__',
  '.pytest_cache',
  'venv',
  'env',
  '.venv',
  'vendor',
  'bower_components',
  '.idea',
  '.vscode',
  '.vs',
];

// File patterns to skip
export const IGNORE_FILES = [
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'composer.lock',
  'Gemfile.lock',
  '.DS_Store',
  'Thumbs.db',
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
];

// File extensions to skip (binary/generated)
export const IGNORE_EXTENSIONS = [
  '.min.js',
  '.min.css',
  '.bundle.js',
  '.chunk.js',
  '.map',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.ico',
  '.webp',
  '.mp3',
  '.mp4',
  '.wav',
  '.avi',
  '.mov',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.zip',
  '.tar',
  '.gz',
  '.rar',
  '.7z',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.otf',
];

// Allowed source code extensions
export const ALLOWED_EXTENSIONS = [
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.cjs',
  '.vue',
  '.svelte',
  '.py',
  '.rb',
  '.php',
  '.java',
  '.go',
  '.rs',
  '.c',
  '.cpp',
  '.h',
  '.hpp',
  '.cs',
  '.swift',
  '.kt',
  '.scala',
  '.html',
  '.css',
  '.scss',
  '.sass',
  '.less',
  '.json',
  '.yaml',
  '.yml',
  '.toml',
  '.xml',
  '.md',
  '.mdx',
  '.txt',
  '.sql',
  '.graphql',
  '.gql',
  '.prisma',
  '.env.example',
  '.gitignore',
  '.dockerignore',
  'Dockerfile',
  'Makefile',
];

const IGNORED_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '*.log',
  'package-lock.json',
  '.env*',
  '*.min.js',
  '*.bundle.js',
  // removed textual source extensions (html/css/json/md/etc) so scanner can index them
];

const ALLOWED_TEXT_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.cjs',
  '.json',
  '.html',
  '.htm',
  '.css',
  '.scss',
  '.sass',
  '.less',
  '.md',
  '.mdx',
  '.yml',
  '.yaml',
  '.toml',
  '.xml',
  '.graphql',
  '.gql',
  '.env',
  '.env.example',
  '.sql',
  '.txt',
]);

/**
 * Check if a path should be ignored
 */
export function shouldIgnorePath(filePath) {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const parts = normalizedPath.split('/');
  const fileName = parts[parts.length - 1];

  // Check if any folder in path is in ignore list
  for (const part of parts) {
    if (IGNORE_FOLDERS.includes(part)) {
      return true;
    }
  }

  // Check if file is in ignore list
  if (IGNORE_FILES.includes(fileName)) {
    return true;
  }

  // Check if extension should be ignored
  for (const ext of IGNORE_EXTENSIONS) {
    if (fileName.endsWith(ext)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if file has an allowed extension for analysis
 */
export function isAllowedFile(filePath) {
  const ext = getFileExtension(filePath);
  // allow text-based extensions
  if (ALLOWED_TEXT_EXTENSIONS.has(ext)) return true;

  // fallback: disallow large binaries by extension
  const binaryExts = new Set([
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.ico',
    '.bmp',
    '.webp',
    '.zip',
    '.tar',
    '.gz',
    '.mp4',
    '.mp3',
    '.exe',
    '.dll',
  ]);
  return !binaryExts.has(ext);
}

/**
 * Get file extension
 */
export function getFileExtension(filePath) {
  const fileName = filePath.split(/[/\\]/).pop();
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex > 0 ? fileName.substring(dotIndex) : '';
}
