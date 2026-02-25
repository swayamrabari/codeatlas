import fs from 'fs/promises';
import path from 'path';
import {
  shouldIgnorePath,
  isAllowedFile,
  getFileExtension,
} from '../utils/ignoreFolders.js';
import {
  detectFrameworks,
  getProjectType,
} from '../utils/frameworkDetector.js';
import {
  buildRelationshipGraph,
  getRelationshipStats,
} from '../utils/relationshipBuilder.js';
import { detectFeatures } from '../utils/featureDetector.js';

// Maximum file size to read (1MB)
const MAX_FILE_SIZE = 1024 * 1024;

/**
 * Recursively get all files in a directory
 * @param {string} dirPath - Directory path
 * @param {string} basePath - Base path for relative paths
 * @returns {Promise<string[]>} - Array of relative file paths
 */
async function getAllFiles(dirPath, basePath = dirPath) {
  const files = [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(basePath, fullPath);

    if (shouldIgnorePath(relativePath)) {
      continue;
    }

    if (entry.isDirectory()) {
      const subFiles = await getAllFiles(fullPath, basePath);
      files.push(...subFiles);
    } else if (entry.isFile() && isAllowedFile(entry.name)) {
      files.push(relativePath);
    }
  }

  return files;
}

/**
 * Read file content safely
 * @param {string} filePath - Full file path
 * @returns {Promise<string|null>}
 */
async function readFileContent(filePath) {
  try {
    const stat = await fs.stat(filePath);

    if (stat.size > MAX_FILE_SIZE) return null;

    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch {
    return null;
  }
}

// --- Path-based classification: full TS/JS ecosystem ---

/** Check if the file resides under a known frontend root directory. */
const FRONTEND_ROOT_PATTERNS = /^(client|frontend|web|app|ui)\//i;
const BACKEND_ROOT_PATTERNS = /^(server|backend|api-server)\//i;

function isFrontendRoot(normalizedPath) {
  if (FRONTEND_ROOT_PATTERNS.test(normalizedPath)) return true;
  // src/ without a server/ prefix is usually frontend in fullstack projects
  if (
    /^src\//.test(normalizedPath) &&
    !BACKEND_ROOT_PATTERNS.test(normalizedPath)
  )
    return true;
  return false;
}

function isBackendRoot(normalizedPath) {
  return BACKEND_ROOT_PATTERNS.test(normalizedPath);
}

/** Known config filenames (exact or suffix). Lowercase for comparison. */
const CONFIG_FILE_PATTERNS = [
  'package.json',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'bun.lockb',
  'lerna.json',
  'nx.json',
  'turbo.json',
  'tsconfig.json',
  'jsconfig.json',
  'tsconfig.base.json',
  'tsconfig.app.json',
  'tsconfig.node.json',
  'tsconfig.test.json',
  'tsconfig.build.json',
  'vercel.json',
  'netlify.toml',
  'netlify.json',
  'firebase.json',
  '.firebaserc',
  'vitest.config',
  'vite.config',
  'vitest.config.',
  'vite.config.',
  'next.config',
  'nuxt.config',
  'nuxt.config.',
  'svelte.config',
  'angular.json',
  'astro.config',
  'remix.config',
  'tailwind.config',
  'postcss.config',
  'postcss.config.',
  'jest.config',
  'jest.config.',
  'jest.setup',
  'vitest.setup',
  'karma.conf',
  'mocha.opts',
  'cypress.config',
  'playwright.config',
  'webpack.config',
  'webpack.config.',
  'rollup.config',
  'rspack.config',
  'esbuild.config',
  'parcel.config',
  'babel.config',
  'babel.config.',
  '.babelrc',
  '.babelrc.json',
  '.babelrc.js',
  'eslint.config',
  '.eslintrc',
  '.eslintrc.js',
  '.eslintrc.json',
  '.eslintrc.yml',
  '.prettierrc',
  '.prettierrc.js',
  '.prettierrc.json',
  '.prettierrc.yaml',
  'prettier.config',
  'stylelint.config',
  '.stylelintrc',
  'commitlint.config',
  '.commitlintrc',
  'lint-staged.config',
  'husky',
  '.nvmrc',
  '.node-version',
  '.npmrc',
  '.yarnrc',
  '.yarnrc.yml',
  'docker-compose',
  'docker-compose.',
  'Dockerfile',
  '.dockerignore',
  'Makefile',
  'justfile',
  'Procfile',
  '.env.example',
  '.env.sample',
  '.env.template',
  '.editorconfig',
  '.gitignore',
  '.gitattributes',
  'renovate.json',
  'dependabot.yml',
  '.releaserc',
  'release.config',
];

/** Directory segments that imply role (lowercase). */
const DIR_ROLES = {
  routes: { type: 'route', role: 'Route definition', category: 'backend' },
  route: { type: 'route', role: 'Route definition', category: 'backend' },
  api: {
    type: 'api-client',
    role: 'API client module',
    category: 'frontend',
    backendOverride: {
      type: 'route',
      role: 'API route/handler',
      category: 'backend',
    },
  },
  pages: { type: 'page', role: 'Page/view', category: 'frontend' },
  page: { type: 'page', role: 'Page/view', category: 'frontend' },
  app: { type: 'page', role: 'App router / page', category: 'frontend' },
  views: { type: 'page', role: 'View template', category: 'frontend' },
  components: { type: 'component', role: 'UI component', category: 'frontend' },
  component: { type: 'component', role: 'UI component', category: 'frontend' },
  ui: { type: 'component', role: 'UI component', category: 'frontend' },
  widgets: { type: 'component', role: 'UI widget', category: 'frontend' },
  controllers: { type: 'controller', role: 'Controller', category: 'backend' },
  controller: { type: 'controller', role: 'Controller', category: 'backend' },
  services: {
    type: 'service',
    role: 'Service / business logic',
    category: 'backend',
  },
  service: {
    type: 'service',
    role: 'Service / business logic',
    category: 'backend',
  },
  models: { type: 'model', role: 'Data model', category: 'backend' },
  model: { type: 'model', role: 'Data model', category: 'backend' },
  schemas: { type: 'model', role: 'Schema definition', category: 'backend' },
  schema: { type: 'model', role: 'Schema definition', category: 'backend' },
  middleware: { type: 'middleware', role: 'Middleware', category: 'backend' },
  middlewares: { type: 'middleware', role: 'Middleware', category: 'backend' },
  lib: { type: 'utility', role: 'Library / shared code', category: 'shared' },
  libs: { type: 'utility', role: 'Library / shared code', category: 'shared' },
  utils: { type: 'utility', role: 'Utility', category: 'shared' },
  util: { type: 'utility', role: 'Utility', category: 'shared' },
  helpers: { type: 'utility', role: 'Helper', category: 'shared' },
  hooks: { type: 'utility', role: 'React/hooks', category: 'frontend' },
  store: { type: 'store', role: 'State store', category: 'frontend' },
  stores: { type: 'store', role: 'State store', category: 'frontend' },
  providers: {
    type: 'component',
    role: 'Context/provider',
    category: 'frontend',
  },
  layouts: { type: 'component', role: 'Layout', category: 'frontend' },
  layout: { type: 'component', role: 'Layout', category: 'frontend' },
  types: { type: 'types', role: 'Type definitions', category: 'shared' },
  typings: { type: 'types', role: 'Type definitions', category: 'shared' },
  interfaces: { type: 'types', role: 'Type definitions', category: 'shared' },
  constants: { type: 'utility', role: 'Constants', category: 'shared' },
  config: { type: 'config', role: 'Configuration', category: 'infrastructure' },
  configs: {
    type: 'config',
    role: 'Configuration',
    category: 'infrastructure',
  },
  __tests__: { type: 'test', role: 'Test file', category: 'test' },
  __mocks__: { type: 'test', role: 'Mock', category: 'test' },
  __fixtures__: { type: 'test', role: 'Test fixture', category: 'test' },
  test: { type: 'test', role: 'Test file', category: 'test' },
  tests: { type: 'test', role: 'Test file', category: 'test' },
  spec: { type: 'test', role: 'Test spec', category: 'test' },
  specs: { type: 'test', role: 'Test spec', category: 'test' },
  e2e: { type: 'test', role: 'E2E test', category: 'test' },
  integration: { type: 'test', role: 'Integration test', category: 'test' },
  scripts: { type: 'script', role: 'Script', category: 'infrastructure' },
  script: { type: 'script', role: 'Script', category: 'infrastructure' },
  migrations: { type: 'script', role: 'Migration', category: 'backend' },
  seed: { type: 'script', role: 'Seed data', category: 'backend' },
  seeds: { type: 'script', role: 'Seed data', category: 'backend' },
  public: { type: 'static', role: 'Static asset (path)', category: 'frontend' },
  static: { type: 'static', role: 'Static asset', category: 'frontend' },
  assets: { type: 'static', role: 'Asset', category: 'frontend' },
  styles: { type: 'style', role: 'Styles', category: 'frontend' },
  theme: { type: 'style', role: 'Theme', category: 'frontend' },
  themes: { type: 'style', role: 'Theme', category: 'frontend' },
  docs: { type: 'docs', role: 'Documentation', category: 'documentation' },
  documentation: {
    type: 'docs',
    role: 'Documentation',
    category: 'documentation',
  },
  workflows: {
    type: 'config',
    role: 'CI workflow',
    category: 'infrastructure',
  },
  actions: {
    type: 'config',
    role: 'GitHub Actions',
    category: 'infrastructure',
  },
};

function isConfigFileName(fileName) {
  const lower = fileName.toLowerCase();
  if (CONFIG_FILE_PATTERNS.some((p) => lower === p || lower.startsWith(p)))
    return true;
  if (/\.config\.(js|ts|mjs|cjs)$/.test(lower)) return true;
  if (/\.(eslintrc|prettierrc|babelrc)(\.(js|json|yml|yaml))?$/.test(lower))
    return true;
  if (
    /^(vite|vitest|next|nuxt|tailwind|postcss|jest|webpack|rollup|babel|prettier|eslint|stylelint|commitlint)\.config\.(js|ts|mjs|cjs)$/.test(
      lower,
    )
  )
    return true;
  if (/^docker-compose\.(yml|yaml|json)$/.test(lower)) return true;
  if (
    /^\.(env\.example|env\.sample|env\.template|nvmrc|node-version|npmrc|yarnrc)$/.test(
      lower,
    )
  )
    return true;
  return false;
}

function isTestFileName(fileName) {
  const lower = fileName.toLowerCase();
  return (
    /\.(test|spec)\.(js|jsx|ts|tsx|mjs|cjs)$/.test(lower) ||
    /\.(test|spec)\.(vue|svelte)$/.test(lower)
  );
}

function isDeclarationFile(fileName) {
  return /\.d\.(ts|tsx)$/.test(fileName);
}

/**
 * Classify file by path (Layer 1) — full TS/JS ecosystem
 * @param {string} filePath - Relative file path
 * @returns {object} { type, role, category }
 */
function classifyByPath(filePath) {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const normalizedLower = normalizedPath.toLowerCase();
  const parts = normalizedPath.split('/');
  const fileName = parts[parts.length - 1];
  const fileNameLower = fileName.toLowerCase();
  const ext = getFileExtension(fileName);

  let type = 'utility';
  let role = 'Source file';
  let category = 'shared';

  // ---------- 1. Config / manifest by filename ----------
  if (isConfigFileName(fileName)) {
    if (fileNameLower === 'package.json') {
      return {
        type: 'manifest',
        role: 'Package manifest',
        category: 'infrastructure',
      };
    }
    if (
      /^(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb)$/.test(
        fileNameLower,
      )
    ) {
      return { type: 'manifest', role: 'Lockfile', category: 'infrastructure' };
    }
    if (
      fileNameLower === 'pnpm-workspace.yaml' ||
      fileNameLower === 'lerna.json' ||
      fileNameLower === 'nx.json' ||
      fileNameLower === 'turbo.json'
    ) {
      return {
        type: 'manifest',
        role: 'Monorepo / workspace config',
        category: 'infrastructure',
      };
    }
    if (
      /^tsconfig\.?.*\.json$/.test(fileNameLower) ||
      fileNameLower === 'jsconfig.json'
    ) {
      return {
        type: 'config',
        role: 'TypeScript/JS project config',
        category: 'infrastructure',
      };
    }
    if (
      /^(vercel|netlify|firebase)\.json$/.test(fileNameLower) ||
      fileNameLower === 'netlify.toml'
    ) {
      return {
        type: 'config',
        role: 'Hosting/deploy config',
        category: 'infrastructure',
      };
    }
    if (
      /^(vite|vitest|next|nuxt|svelte|astro|remix|tailwind|postcss|webpack|rollup|babel|eslint|prettier|stylelint|commitlint)\.config\./.test(
        fileNameLower,
      ) ||
      /\.(eslintrc|prettierrc|babelrc)/.test(fileNameLower)
    ) {
      return {
        type: 'config',
        role: 'Build/lint config',
        category: 'infrastructure',
      };
    }
    if (
      /^jest\.(config|setup)/.test(fileNameLower) ||
      /^vitest\.(config|setup)/.test(fileNameLower) ||
      /^(karma|cypress|playwright)\.(config|conf)/.test(fileNameLower)
    ) {
      return {
        type: 'config',
        role: 'Test runner config',
        category: 'infrastructure',
      };
    }
    if (
      /^docker-compose\./.test(fileNameLower) ||
      fileNameLower === 'dockerfile' ||
      fileNameLower === '.dockerignore'
    ) {
      return {
        type: 'config',
        role: 'Docker config',
        category: 'infrastructure',
      };
    }
    if (
      fileNameLower === 'makefile' ||
      fileNameLower === 'justfile' ||
      fileNameLower === 'procfile'
    ) {
      return {
        type: 'script',
        role: 'Build/run script',
        category: 'infrastructure',
      };
    }
    if (
      /^\.(env\.example|env\.sample|env\.template|gitignore|gitattributes|editorconfig|npmrc|yarnrc|nvmrc|node-version)$/.test(
        fileNameLower,
      )
    ) {
      return {
        type: 'config',
        role: 'Environment/tool config',
        category: 'infrastructure',
      };
    }
    return {
      type: 'config',
      role: 'Configuration file',
      category: 'infrastructure',
    };
  }

  // ---------- 2. Test files by path or filename ----------
  if (isTestFileName(fileName)) {
    return { type: 'test', role: 'Test/spec file', category: 'test' };
  }
  for (const part of parts) {
    const seg = part.toLowerCase();
    const dirRole = DIR_ROLES[seg];
    if (dirRole && dirRole.type === 'test') {
      return { type: 'test', role: dirRole.role, category: 'test' };
    }
  }

  // ---------- 3. Markup / HTML ----------
  if (['.html', '.htm'].includes(ext)) {
    return { type: 'markup', role: 'HTML file', category: 'frontend' };
  }

  // ---------- 4. Styles ----------
  if (['.css', '.scss', '.sass', '.less'].includes(ext)) {
    return { type: 'style', role: 'Stylesheet', category: 'frontend' };
  }

  // ---------- 5. JSON (non-config already handled) ----------
  if (ext === '.json') {
    return { type: 'data', role: 'JSON data', category: 'infrastructure' };
  }

  // ---------- 6. YAML/TOML (generic) ----------
  if (['.yml', '.yaml', '.toml'].includes(ext)) {
    const inWorkflows =
      normalizedLower.includes('/.github/') &&
      (normalizedLower.includes('workflows') ||
        normalizedLower.includes('actions'));
    return {
      type: 'config',
      role: inWorkflows ? 'CI workflow' : 'Configuration file',
      category: 'infrastructure',
    };
  }

  // ---------- 7. Documentation ----------
  if (['.md', '.mdx'].includes(ext)) {
    return { type: 'docs', role: 'Documentation', category: 'documentation' };
  }

  // ---------- 8. Type declaration files ----------
  if (isDeclarationFile(fileName)) {
    return { type: 'types', role: 'Type declarations', category: 'shared' };
  }

  // ---------- 9. GraphQL ----------
  if (['.graphql', '.gql'].includes(ext)) {
    return { type: 'data', role: 'GraphQL schema/query', category: 'backend' };
  }

  // ---------- 10. Prisma ----------
  if (ext === '.prisma') {
    return { type: 'model', role: 'Prisma schema', category: 'backend' };
  }

  // ---------- 11. SQL ----------
  if (ext === '.sql') {
    return { type: 'script', role: 'SQL script', category: 'backend' };
  }

  // ---------- 12. Entry-point detection ----------
  const ENTRY_POINT_NAMES = new Set([
    'server.js',
    'server.ts',
    'server.mjs',
    'app.js',
    'app.ts',
    'app.mjs',
    'main.js',
    'main.ts',
    'main.mjs',
    'main.tsx',
    'main.jsx',
    'index.js',
    'index.ts',
    'index.mjs',
    'index.tsx',
    'index.jsx',
  ]);
  if (ENTRY_POINT_NAMES.has(fileNameLower)) {
    // Only classify as entry-point if at or near root level (depth <= 2)
    // e.g. server/server.js, client/src/main.tsx, src/index.ts
    const depth = parts.length;
    if (depth <= 3) {
      if (
        isBackendRoot(normalizedPath) ||
        /^server\./i.test(fileNameLower) ||
        /^app\./i.test(fileNameLower)
      ) {
        return {
          type: 'entry-point',
          role: 'Server entry point',
          category: 'backend',
        };
      }
      if (isFrontendRoot(normalizedPath)) {
        return {
          type: 'entry-point',
          role: 'App entry point',
          category: 'frontend',
        };
      }
    }
  }

  // ---------- 13. Directory-based role (for JS/TS/Vue/Svelte etc.) ----------
  const inFrontend = isFrontendRoot(normalizedPath);
  const inBackend = isBackendRoot(normalizedPath);

  for (let i = parts.length - 1; i >= 0; i--) {
    const segment = parts[i].toLowerCase();
    const dirRole = DIR_ROLES[segment];
    if (dirRole && dirRole.type !== 'test') {
      // Handle api/ directory with context awareness
      let t = dirRole.type;
      let r = dirRole.role;
      let c = dirRole.category;

      if (dirRole.backendOverride && inBackend) {
        t = dirRole.backendOverride.type;
        r = dirRole.backendOverride.role;
        c = dirRole.backendOverride.category;
      } else if (dirRole.backendOverride && !inFrontend && !inBackend) {
        // Ambiguous root — default to backend for api/
        t = dirRole.backendOverride.type;
        r = dirRole.backendOverride.role;
        c = dirRole.backendOverride.category;
      }

      // Override category for utils/lib under a specific root
      if (c === 'shared' && inBackend) c = 'backend';
      if (c === 'shared' && inFrontend) c = 'frontend';

      if (
        [
          '.js',
          '.jsx',
          '.ts',
          '.tsx',
          '.mjs',
          '.cjs',
          '.vue',
          '.svelte',
        ].includes(ext)
      ) {
        return { type: t, role: r, category: c };
      }
      if (t === 'style' && ['.css', '.scss', '.sass', '.less'].includes(ext)) {
        return { type: t, role: r, category: c };
      }
      if (t === 'static' && !['.js', '.ts'].includes(ext)) {
        return { type: t, role: r, category: c };
      }
    }
  }

  // ---------- 14. Extension-based type/role for source files ----------
  if (['.vue', '.svelte'].includes(ext)) {
    return { type: 'component', role: 'SFC component', category: 'frontend' };
  }
  if (['.tsx', '.jsx'].includes(ext)) {
    return {
      type: 'component',
      role: 'JSX/TSX module',
      category: inBackend ? 'backend' : 'frontend',
    };
  }
  if (['.ts', '.js', '.mjs', '.cjs'].includes(ext)) {
    const fallbackCategory = inBackend
      ? 'backend'
      : inFrontend
        ? 'frontend'
        : 'shared';
    return {
      type: 'utility',
      role: 'Script/module',
      category: fallbackCategory,
    };
  }

  // ---------- 15. Plain text / other ----------
  if (ext === '.txt') {
    return { type: 'docs', role: 'Text file', category: 'documentation' };
  }
  if (ext === '.xml') {
    return { type: 'markup', role: 'XML file', category: 'other' };
  }

  return { type, role, category };
}

/**
 * Classify file by content (Layer 2) - Pattern scoring for TS/JS ecosystem
 * @param {string} content - File content
 * @param {string} filePath - File path for context
 * @returns {object|null}
 */
function classifyByContent(content, filePath) {
  if (!content) return null;

  const scores = {
    route: 0,
    controller: 0,
    service: 0,
    model: 0,
    component: 0,
    page: 0,
    middleware: 0,
    config: 0,
    types: 0,
    utility: 0,
  };

  // Route patterns (Express, Fastify, Hono, etc.)
  if (/\.(get|post|put|delete|patch|all)\s*\(/.test(content))
    scores.route += 10;
  if (/router\.(get|post|put|delete|patch|all)/.test(content))
    scores.route += 15;
  if (/app\.(get|post|put|delete|patch|all)/.test(content)) scores.route += 12;
  if (/Router\(\)|createRouter|defineRoute/.test(content)) scores.route += 8;
  if (/export\s+(const|default)\s+(get|post|put|delete|patch)\s+/.test(content))
    scores.route += 12; // Next.js/Vercel route handlers

  // Controller patterns
  if (/\(req,\s*res/.test(content) || /\(request,\s*response/.test(content))
    scores.controller += 8;
  if (/res\.(json|send|status|render|redirect)/.test(content))
    scores.controller += 5;
  if (/req\.(body|params|query|headers|cookies)/.test(content))
    scores.controller += 3;
  if (/async\s+\w+\s*\(\s*req\s*,\s*res/.test(content)) scores.controller += 10;

  // Service patterns
  if (/class\s+\w+Service/.test(content)) scores.service += 15;
  if (/@Injectable\s*\(/.test(content)) scores.service += 8; // NestJS
  if (/async\s+\w+\s*\([^)]*\)\s*{/.test(content) && !/req|res/.test(content))
    scores.service += 5;
  if (
    /\.find(Many|First|Unique)?\(|\.create\(|\.update\(|\.delete\(|\.upsert\(/.test(
      content,
    )
  )
    scores.service += 3;

  // Model patterns (Mongoose, Sequelize, Prisma, TypeORM)
  if (/new\s+(mongoose\.)?Schema\s*\(/.test(content)) scores.model += 20;
  if (/mongoose\.model\s*\(/.test(content)) scores.model += 15;
  if (/sequelize\.define/.test(content)) scores.model += 15;
  if (/@Entity|@Table|@Column|@PrimaryColumn/.test(content)) scores.model += 15;
  if (/model\s+\w+\s*{/.test(content) && /@@map|@@id/.test(content))
    scores.model += 12; // Prisma
  if (/defineModel|defineTable/.test(content)) scores.model += 8;

  // Component patterns (React, Vue, Svelte)
  if (/<[A-Z][a-zA-Z0-9]*[\s/>]/.test(content)) scores.component += 5;
  if (
    /useState|useEffect|useContext|useReducer|useMemo|useCallback|useRef/.test(
      content,
    )
  )
    scores.component += 8;
  if (/export\s+(default\s+)?function\s+[A-Z]/.test(content))
    scores.component += 5;
  if (/return\s*\(\s*</.test(content)) scores.component += 10;
  if (/import\s+React|from\s+['"]react['"]/.test(content))
    scores.component += 3;
  if (/<template>|<script>|<style>/.test(content)) scores.component += 10;
  if (/svelte:element|on:click|bind:/.test(content)) scores.component += 8;

  // Page patterns (Next, Nuxt, Remix)
  if (/getServerSideProps|getStaticProps|getStaticPaths/.test(content))
    scores.page += 15;
  if (
    /useRouter|useNavigate|useParams|useSearchParams|usePathname/.test(content)
  )
    scores.page += 5;
  if (/export\s+(const\s+)?(metadata|generateMetadata)/.test(content))
    scores.page += 8; // Next App Router
  if (
    /loader|action\s*[:(]/.test(content) &&
    /Form|useLoaderData/.test(content)
  )
    scores.page += 6; // Remix

  // Middleware patterns
  if (/\(req,\s*res,\s*next\)/.test(content)) scores.middleware += 15;
  if (/next\(\)|next\s*\(/.test(content)) scores.middleware += 5;
  if (/export\s+const\s+config\s*=\s*{.*matcher/.test(content))
    scores.middleware += 10; // Next.js middleware
  if (/middleware\s*\(/.test(content) && /NextResponse|redirect/.test(content))
    scores.middleware += 10;

  // Config patterns (export default { ... } small files, defineConfig, etc.)
  if (/defineConfig\s*\(|defineProject\s*\(/.test(content)) scores.config += 12;
  if (/module\.exports\s*=\s*{/.test(content)) scores.config += 5;
  if (/export\s+default\s+{/.test(content) && content.length < 2500)
    scores.config += 4;
  if (
    /plugins?\s*:\s*\[|resolve\s*:\s*{/.test(content) &&
    content.length < 3000
  )
    scores.config += 5; // Vite/Webpack

  // Type definition patterns (.d.ts or types file)
  if (
    /declare\s+(module|namespace|function|const|class|interface|type)/.test(
      content,
    )
  )
    scores.types += 15;
  if (/interface\s+\w+\s*{/.test(content)) scores.types += 5;
  if (/type\s+\w+\s*=\s*/.test(content) && !/useState|useReducer/.test(content))
    scores.types += 3;

  // Find highest score
  let maxScore = 0;
  let maxType = null;
  for (const [type, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxType = type;
    }
  }

  if (maxScore >= 8) {
    const roleMap = {
      route: 'API route handler',
      controller: 'Request/response controller',
      service: 'Business logic service',
      model: 'Database model/schema',
      component: 'UI component',
      page: 'Page component',
      middleware: 'Middleware function',
      config: 'Configuration',
      types: 'Type definitions',
      utility: 'Utility function',
    };
    return {
      type: maxType,
      role: roleMap[maxType] || 'Source file',
      confidence: Math.min(maxScore / 22, 1),
    };
  }
  return null;
}

/**
 * Resolve import path to actual file path
 * @param {string} importPath - Import path (e.g., './utils', '../components/Button', '@/lib/api')
 * @param {string} fromFilePath - File path that contains the import (relative to project root)
 * @param {Set<string>} allFilePaths - Set of all file paths in project (normalized)
 * @returns {string|null} - Resolved file path or null if not found
 */
function resolveImportPath(importPath, fromFilePath, allFilePaths) {
  // Skip node_modules and external packages (npm packages, scoped packages, etc.)
  if (
    !importPath.startsWith('.') &&
    !importPath.startsWith('/') &&
    !importPath.startsWith('@/') &&
    !importPath.startsWith('~/')
  ) {
    return null; // External package
  }

  const normalizedFrom = fromFilePath.replace(/\\/g, '/');
  const fromDir = path.dirname(normalizedFrom);

  let resolvedPath = null;

  // Handle @/ alias (common in Next.js, Vite, etc.)
  if (importPath.startsWith('@/')) {
    const aliasPath = importPath.substring(2).replace(/\/$/, ''); // Remove trailing slash
    // Try common alias directories: src/, lib/, app/, components/, utils/
    const aliasDirs = [
      'src',
      'lib',
      'app',
      'components',
      'utils',
      'pages',
      'routes',
    ];

    // Also derive prefix from the importing file's path for monorepo-style projects.
    // e.g., if fromFilePath is "client/src/pages/Insights.tsx", try "client/src/" as prefix
    const srcMatch = normalizedFrom.match(/^(.+?\/src)\//);
    if (srcMatch) {
      // Insert the derived prefix at the beginning so it's tried first
      aliasDirs.unshift(srcMatch[1]);
    }
    // Also try <prefix>/lib, <prefix>/app patterns
    const rootMatch = normalizedFrom.match(/^([^/]+)\//);
    if (rootMatch) {
      const rootDir = rootMatch[1];
      ['src', 'lib', 'app'].forEach((sub) => {
        const candidate = `${rootDir}/${sub}`;
        if (!aliasDirs.includes(candidate)) {
          aliasDirs.push(candidate);
        }
      });
    }

    for (const aliasDir of aliasDirs) {
      const candidate = `${aliasDir}/${aliasPath}`;
      if (allFilePaths.has(candidate)) {
        resolvedPath = candidate;
        break;
      }
      // Check extensions for this candidate
      const extensions = [
        '.ts',
        '.tsx',
        '.js',
        '.jsx',
        '.mjs',
        '.cjs',
        '.vue',
        '.svelte',
      ];
      let foundExt = false;
      for (const ext of extensions) {
        if (allFilePaths.has(candidate + ext)) {
          resolvedPath = candidate + ext;
          foundExt = true;
          break;
        }
      }
      // Check for index files
      if (!foundExt) {
        const indexFiles = ['index.ts', 'index.tsx', 'index.js', 'index.jsx'];
        for (const idx of indexFiles) {
          if (allFilePaths.has(`${candidate}/${idx}`)) {
            resolvedPath = `${candidate}/${idx}`;
            foundExt = true;
            break;
          }
        }
      }
      if (foundExt) break;
    }
    if (!resolvedPath) {
      // Try root-level
      if (allFilePaths.has(aliasPath)) {
        resolvedPath = aliasPath;
      }
    }
  } else if (importPath.startsWith('~/')) {
    // Handle ~/ alias (sometimes used as src/ alias)
    const aliasPath = importPath.substring(2).replace(/\/$/, '');
    const aliasDirs = ['src', 'lib', 'app'];
    for (const aliasDir of aliasDirs) {
      const candidate = `${aliasDir}/${aliasPath}`;
      if (allFilePaths.has(candidate)) {
        resolvedPath = candidate;
        break;
      }
      // Check extensions for this candidate
      const extensions = [
        '.ts',
        '.tsx',
        '.js',
        '.jsx',
        '.mjs',
        '.cjs',
        '.vue',
        '.svelte',
      ];
      let foundExt = false;
      for (const ext of extensions) {
        if (allFilePaths.has(candidate + ext)) {
          resolvedPath = candidate + ext;
          foundExt = true;
          break;
        }
      }
      // Check for index files
      if (!foundExt) {
        const indexFiles = ['index.ts', 'index.tsx', 'index.js', 'index.jsx'];
        for (const idx of indexFiles) {
          if (allFilePaths.has(`${candidate}/${idx}`)) {
            resolvedPath = `${candidate}/${idx}`;
            foundExt = true;
            break;
          }
        }
      }
      if (foundExt) break;
    }
  } else if (importPath.startsWith('/')) {
    // Absolute path from project root
    resolvedPath = importPath.substring(1).replace(/\/$/, '');
  } else {
    // Relative path (./ or ../)
    const candidate = path.join(fromDir, importPath).replace(/\\/g, '/');
    resolvedPath = candidate.replace(/\/$/, ''); // Remove trailing slash
  }

  if (!resolvedPath) return null;

  // Try exact match first
  if (allFilePaths.has(resolvedPath)) {
    return resolvedPath;
  }

  // Try with extensions (.js, .ts, .jsx, .tsx, .json, .vue, .svelte)
  const extensions = [
    '.js',
    '.ts',
    '.jsx',
    '.tsx',
    '.mjs',
    '.cjs',
    '.json',
    '.vue',
    '.svelte',
  ];
  for (const ext of extensions) {
    const withExt = resolvedPath + ext;
    if (allFilePaths.has(withExt)) {
      return withExt;
    }
  }

  // Try index files (directory imports)
  const indexFiles = [
    'index.js',
    'index.ts',
    'index.jsx',
    'index.tsx',
    'index.mjs',
    'index.cjs',
    'index.json',
  ];
  for (const indexFile of indexFiles) {
    const indexPath = `${resolvedPath}/${indexFile}`;
    if (allFilePaths.has(indexPath)) {
      return indexPath;
    }
  }

  return null;
}

/**
 * Infer kind of export by name (function/class/const in file)
 * @param {string} content - File content
 * @param {string} name - Export name (e.g. MyComponent, register)
 * @returns {string} - 'function' | 'class' | 'const' | 'unknown'
 */
function inferExportKind(content, name) {
  if (!name || name.startsWith('(')) return 'unknown';
  const esc = escapeRegExp(name);
  // async function name( or function name(
  if (
    new RegExp(`\\b(?:async\\s+)?function\\s+${esc}\\s*\\(`).test(content) ||
    new RegExp(`\\bfunction\\s+${esc}\\s*\\(`).test(content)
  )
    return 'function';
  // class Name { or class Name extends
  if (new RegExp(`\\bclass\\s+${esc}\\s*[{\\s]`).test(content)) return 'class';
  // const/let/var name = ... — figure out if function (arrow/expression) or const
  if (new RegExp(`\\b(?:const|let|var)\\s+${esc}\\s*=`).test(content)) {
    if (
      new RegExp(
        `${esc}\\s*=\\s*(?:async\\s+)?(?:function|\\([^)]*\\)\\s*=>|[A-Za-z_]\\w*\\s*=>)`,
      ).test(content) ||
      new RegExp(`${esc}\\s*=\\s*async\\s*\\(`).test(content)
    )
      return 'function';
    return 'const';
  }
  // Bare assignment (no const/let/var) — name = async ( or name = function
  if (
    new RegExp(`\\b${esc}\\s*=\\s*(?:async\\s+)?function`).test(content) ||
    new RegExp(`\\b${esc}\\s*=\\s*async\\s*\\(`).test(content) ||
    new RegExp(`\\b${esc}\\s*=\\s*\\([^)]*\\)\\s*=>`).test(content)
  )
    return 'function';
  return 'unknown';
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Derive a meaningful import name from a module path when no explicit binding is detected.
 * E.g. './routes/feedback' -> 'feedback', 'dotenv' -> 'dotenv', '@scope/pkg' -> 'pkg'
 * @param {string} modulePath - The raw import/require specifier
 * @returns {string}
 */
function deriveImportName(modulePath) {
  if (!modulePath) return '';

  // Strip leading ./ or ../
  let cleaned = modulePath.replace(/^\.\.?\//, '');

  // For scoped packages like @scope/pkg, take the package name
  if (cleaned.startsWith('@') && cleaned.includes('/')) {
    cleaned = cleaned.split('/')[1] || cleaned;
  }

  // Take the last meaningful segment of the path
  const segments = cleaned.split('/').filter(Boolean);
  let name = segments[segments.length - 1] || cleaned;

  // Remove file extensions
  name = name.replace(/\.(js|jsx|ts|tsx|mjs|cjs|vue|svelte|json)$/i, '');

  // If it's 'index', use the parent folder name instead
  if (name === 'index' && segments.length >= 2) {
    name = segments[segments.length - 2];
  }

  // Convert kebab-case or dot-separated names to camelCase for readability
  name = name.replace(/[-.](\w)/g, (_, c) => c.toUpperCase());

  return name;
}

/**
 * Parse named import/export list: "a, b as c, d" -> [{ imported: 'a', local: 'a' }, ...]
 * @param {string} listStr
 * @returns {{ imported: string, local: string }[]}
 */
function parseNamedList(listStr) {
  if (!listStr || !listStr.trim()) return [];
  return listStr
    .split(',')
    .map((s) => {
      const part = s.trim().split(/\s+as\s+/);
      const imported = part[0].trim();
      const local = part[1] ? part[1].trim() : imported;
      return { imported, local };
    })
    .filter((n) => n.imported && n.local);
}

/**
 * Extract code analysis from content
 * @param {string} content - File content
 * @param {string} filePath - File path (relative to project root)
 * @param {Set<string>} allFilePaths - Set of all file paths for resolution
 * @returns {object}
 */
function analyzeCode(content, filePath, allFilePaths = new Set()) {
  const analysis = {
    imports: [],
    resolvedImports: [], // File paths that this file imports
    exports: [],
    apiCalls: [],
    components: [],
    functions: [],
    routes: [], // Express/Fastify/etc route definitions
  };

  if (!content) return analysis;

  const pushResolved = (importPath) => {
    if (allFilePaths.size > 0) {
      const resolved = resolveImportPath(importPath, filePath, allFilePaths);
      if (resolved) analysis.resolvedImports.push(resolved);
    }
  };

  // --- ES imports: capture actual bindings (default, named, namespace, type-only) ---
  // import type { A, B } from 'path'
  for (const m of content.matchAll(
    /import\s+type\s+{\s*([^}]+)\s*}\s+from\s+['"`]([^'"`]+)['"`]/g,
  )) {
    const importPath = m[2];
    analysis.imports.push({
      type: 'esm',
      value: importPath,
      isTypeOnly: true,
      named: parseNamedList(m[1]),
    });
    pushResolved(importPath);
  }
  // import type Default from 'path'
  for (const m of content.matchAll(
    /import\s+type\s+(\w+)\s+from\s+['"`]([^'"`]+)['"`]/g,
  )) {
    const importPath = m[2];
    analysis.imports.push({
      type: 'esm',
      value: importPath,
      isTypeOnly: true,
      default: m[1],
    });
    pushResolved(importPath);
  }
  // import type * as NS from 'path'
  for (const m of content.matchAll(
    /import\s+type\s+\*\s+as\s+(\w+)\s+from\s+['"`]([^'"`]+)['"`]/g,
  )) {
    const importPath = m[2];
    analysis.imports.push({
      type: 'esm',
      value: importPath,
      isTypeOnly: true,
      namespace: m[1],
    });
    pushResolved(importPath);
  }
  // import defaultExport, { a, b as c } from 'path'
  for (const m of content.matchAll(
    /import\s+(\w+)\s*,\s*{\s*([^}]*)\s*}\s+from\s+['"`]([^'"`]+)['"`]/g,
  )) {
    const importPath = m[3];
    analysis.imports.push({
      type: 'esm',
      value: importPath,
      default: m[1],
      named: parseNamedList(m[2]),
    });
    pushResolved(importPath);
  }
  // import defaultExport, * as ns from 'path'
  for (const m of content.matchAll(
    /import\s+(\w+)\s*,\s*\*\s+as\s+(\w+)\s+from\s+['"`]([^'"`]+)['"`]/g,
  )) {
    const importPath = m[3];
    analysis.imports.push({
      type: 'esm',
      value: importPath,
      default: m[1],
      namespace: m[2],
    });
    pushResolved(importPath);
  }
  // import { a, b as c } from 'path'
  for (const m of content.matchAll(
    /import\s+{\s*([^}]*)\s*}\s+from\s+['"`]([^'"`]+)['"`]/g,
  )) {
    const importPath = m[2];
    // Skip if this is "import type { ... }" (already captured above)
    if (/\btype\s+{\s*/.test(m[0])) continue;
    analysis.imports.push({
      type: 'esm',
      value: importPath,
      named: parseNamedList(m[1]),
    });
    pushResolved(importPath);
  }
  // import * as ns from 'path'
  for (const m of content.matchAll(
    /import\s+\*\s+as\s+(\w+)\s+from\s+['"`]([^'"`]+)['"`]/g,
  )) {
    const importPath = m[2];
    analysis.imports.push({
      type: 'esm',
      value: importPath,
      namespace: m[1],
    });
    pushResolved(importPath);
  }
  // import defaultExport from 'path'
  for (const m of content.matchAll(
    /import\s+(\w+)\s+from\s+['"`]([^'"`]+)['"`]/g,
  )) {
    const importPath = m[2];
    // Avoid double-add if already had default from "default, { }" or "default, * as"
    const already = analysis.imports.some(
      (i) => i.value === importPath && (i.default || i.namespace),
    );
    if (!already) {
      analysis.imports.push({
        type: 'esm',
        value: importPath,
        default: m[1],
      });
      pushResolved(importPath);
    }
  }
  // import 'path' (side-effect only — no "from" on the same line)
  for (const m of content.matchAll(/import\s+['"`]([^'"`]+)['"`]\s*;?/g)) {
    const fullMatch = m[0];
    const importPath = m[1];
    const lineStart = Math.max(0, content.indexOf(fullMatch));
    const lineEnd = content.indexOf('\n', lineStart);
    const line = content.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
    if (!/\bfrom\s+['"`]/.test(line)) {
      analysis.imports.push({
        type: 'esm',
        value: importPath,
        sideEffect: true,
      });
      pushResolved(importPath);
    }
  }
  // Fallback: any remaining import ... from 'path' (e.g. default with brackets)
  for (const m of content.matchAll(
    /import\s+.+?\s+from\s+['"`]([^'"`]+)['"`]/g,
  )) {
    const importPath = m[1];
    const hasEntry = analysis.imports.some((i) => i.value === importPath);
    if (!hasEntry) {
      analysis.imports.push({ type: 'esm', value: importPath });
      pushResolved(importPath);
    }
  }

  // CommonJS require: capture binding when possible (const x = require(...) or const { a, b } = require(...))
  for (const m of content.matchAll(
    /(?:const|let|var)\s+({[^}]*}|\w+)\s*=\s*require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
  )) {
    const binding = m[1].trim();
    const importPath = m[2];
    const isDestructure = binding.startsWith('{');
    const named = isDestructure ? parseNamedList(binding.slice(1, -1)) : null;
    analysis.imports.push({
      type: 'cjs',
      value: importPath,
      default: isDestructure ? null : binding,
      named: isDestructure ? named : null,
    });
    pushResolved(importPath);
  }
  // require() without assignment (e.g. require('dotenv').config(), app.use(require('./routes/x')))
  for (const m of content.matchAll(
    /(?<![a-zA-Z0-9_])\s*require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
  )) {
    const importPath = m[1];
    const hasEntry = analysis.imports.some(
      (i) => i.value === importPath && i.type === 'cjs',
    );
    if (!hasEntry) {
      // Skip chained calls like require('dotenv').config() — these are side-effect config calls, not real imports
      const afterPos = m.index + m[0].length;
      const afterChar = content.slice(afterPos).trimStart();
      const isChainedCall =
        afterChar.startsWith('.') && /^\.\s*\w+\s*\(/.test(afterChar);

      if (!isChainedCall) {
        analysis.imports.push({
          type: 'cjs',
          value: importPath,
        });
        pushResolved(importPath);
      }
    }
  }

  // axios/fetch api calls (existing)
  const axiosCalls = Array.from(
    content.matchAll(
      /axios\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
    ),
  );
  for (const match of axiosCalls) {
    analysis.apiCalls.push({
      type: 'axios',
      method: match[1].toUpperCase(),
      url: match[2],
    });
  }
  // fetch(...) calls
  for (const m of content.matchAll(/fetch\s*\(\s*['"`]([^'"`]+)['"`]/g)) {
    analysis.apiCalls.push({ type: 'fetch', url: m[1] });
  }

  // Extract Express/Fastify routes
  // Patterns: router.METHOD, app.METHOD, express.METHOD
  const routePatterns = [
    // router.get('/path', ...), router.post('/api/users', ...)
    /(?:router|app|express)\.(get|post|put|delete|patch|options|head|all)\s*\(\s*['"`]([^'"`]+)['"`]/g,
  ];

  for (const pattern of routePatterns) {
    for (const match of content.matchAll(pattern)) {
      const method = match[1].toUpperCase();
      const path = match[2];
      analysis.routes.push({ method, path });
    }
  }

  // Deduplicate routes
  const routeSet = new Set();
  analysis.routes = analysis.routes.filter((route) => {
    const key = `${route.method}|${route.path}`;
    if (routeSet.has(key)) return false;
    routeSet.add(key);
    return true;
  });

  // Components (React JSX)
  const componentMatches = content.matchAll(/<([A-Z][a-zA-Z0-9_]*)/g);
  const components = new Set();
  for (const match of componentMatches) components.add(match[1]);
  analysis.components = Array.from(components);

  // Functions
  for (const m of content.matchAll(/function\s+([A-Za-z0-9_]+)\s*\(/g))
    analysis.functions.push(m[1]);
  for (const m of content.matchAll(/const\s+([A-Za-z0-9_]+)\s*=\s*\(?\s*.*=>/g))
    analysis.functions.push(m[1]);

  // export default function/class (NAMED) — check before anonymous
  for (const m of content.matchAll(
    /export\s+default\s+function\s+([A-Za-z0-9_]+)\s*\(/g,
  )) {
    analysis.exports.push({
      type: 'es_default',
      name: m[1],
      kind: 'function',
    });
  }
  for (const m of content.matchAll(
    /export\s+default\s+class\s+([A-Za-z0-9_]+)[\s{(]/g,
  )) {
    analysis.exports.push({
      type: 'es_default',
      name: m[1],
      kind: 'class',
    });
  }
  // export default function/class (ANONYMOUS)
  for (const m of content.matchAll(/export\s+default\s+function\s*\(/g)) {
    analysis.exports.push({
      type: 'es_default',
      name: '(anonymous function)',
      kind: 'function',
    });
  }
  for (const m of content.matchAll(/export\s+default\s+class\s*[\s{]/g)) {
    analysis.exports.push({
      type: 'es_default',
      name: '(anonymous class)',
      kind: 'class',
    });
  }
  // ES module exports with kind (function, class, const, type, interface)
  for (const m of content.matchAll(/export\s+default\s+([A-Za-z0-9_$.]+)/g)) {
    const name = m[1];
    if (name === 'function' || name === 'class') continue; // already handled above
    const kind = inferExportKind(content, name);
    analysis.exports.push({ type: 'es_default', name, kind });
  }
  // export function/class/const/let/var with explicit kind
  for (const m of content.matchAll(
    /export\s+(function)\s+([A-Za-z0-9_]+)\s*\(/g,
  )) {
    analysis.exports.push({
      type: 'es_named',
      name: m[2],
      kind: 'function',
    });
  }
  for (const m of content.matchAll(
    /export\s+(class)\s+([A-Za-z0-9_]+)[\s{]/g,
  )) {
    analysis.exports.push({
      type: 'es_named',
      name: m[2],
      kind: 'class',
    });
  }
  for (const m of content.matchAll(
    /export\s+(const|let|var)\s+([A-Za-z0-9_]+)/g,
  )) {
    analysis.exports.push({
      type: 'es_named',
      name: m[2],
      kind: m[1],
    });
  }
  // TypeScript: export type X = ... / export interface X
  for (const m of content.matchAll(
    /export\s+(type)\s+([A-Za-z0-9_]+)\s*[=<{]/g,
  )) {
    analysis.exports.push({
      type: 'es_named',
      name: m[2],
      kind: 'type',
    });
  }
  for (const m of content.matchAll(
    /export\s+(interface)\s+([A-Za-z0-9_]+)\s*[<{]/g,
  )) {
    analysis.exports.push({
      type: 'es_named',
      name: m[2],
      kind: 'interface',
    });
  }
  // export { a, b as c } from '...' — re-exports from another module
  for (const m of content.matchAll(
    /export\s*{\s*([^}]+)\s*}\s*from\s*['"`]([^'"`]+)['"`]/g,
  )) {
    const names = m[1].split(',').map((s) => {
      const trimmed = s
        .trim()
        .split(/\s+as\s+/)[0]
        .trim();
      return trimmed;
    });
    for (const n of names) {
      if (n && n !== 'type') {
        analysis.exports.push({
          type: 'es_reexport',
          name: n,
          kind: 'named',
          source: m[2],
        });
      }
    }
  }
  // export { a, b as c } — local named list (kind: 'named'), exclude re-exports
  for (const m of content.matchAll(/export\s*{\s*([^}]+)\s*}/g)) {
    // Skip if this match is a re-export (has 'from' after closing brace)
    const fullMatch = m[0];
    const afterPos = m.index + fullMatch.length;
    const afterStr = content.slice(afterPos, afterPos + 30).trimStart();
    if (afterStr.startsWith('from')) continue;
    const names = m[1].split(',').map((s) => {
      const trimmed = s
        .trim()
        .split(/\s+as\s+/)[0]
        .trim();
      return trimmed;
    });
    for (const n of names) {
      if (n && n !== 'type') {
        const kind = inferExportKind(content, n);
        analysis.exports.push({
          type: 'es_named',
          name: n,
          kind: kind !== 'unknown' ? kind : 'named',
        });
      }
    }
  }
  // CommonJS exports: module.exports = { a, b, c } — list actual exported names
  const cjsObjectExport = content.match(
    /module\.exports\s*=\s*\{([\s\S]*?)\}\s*;?/,
  );
  if (cjsObjectExport) {
    const inner = cjsObjectExport[1];
    // Split by comma (respect simple structure: no nested braces in split)
    const parts = inner.split(',').map((s) => s.trim());
    for (const part of parts) {
      if (!part) continue;
      // "name" or "name: value" or "name,"
      const keyMatch = part.match(/^([A-Za-z0-9_]+)(?:\s*:|$)/);
      const name = keyMatch ? keyMatch[1] : part.replace(/\s*:.*$/, '').trim();
      if (!name || name === 'type') continue;
      const kind = inferExportKind(content, name);
      analysis.exports.push({
        type: 'cjs_named',
        name,
        kind: kind !== 'unknown' ? kind : 'named',
      });
    }
  }

  // module.exports = singleIdentifier (router, authMiddleware, etc.) — not a call like mongoose.model(
  if (!cjsObjectExport) {
    // module.exports = function() {} or module.exports = function name() {}
    const cjsFuncExport = content.match(
      /module\.exports\s*=\s*(?:async\s+)?function\s*([A-Za-z0-9_]*)\s*\(/,
    );
    if (cjsFuncExport) {
      const name = cjsFuncExport[1] || '(anonymous function)';
      analysis.exports.push({
        type: 'cjs_default',
        name,
        kind: 'function',
      });
    }

    // module.exports = class {} or module.exports = class Name {}
    const cjsClassExport = content.match(
      /module\.exports\s*=\s*class\s*([A-Za-z0-9_]*)\s*[{\s]/,
    );
    if (cjsClassExport) {
      const name = cjsClassExport[1] || '(anonymous class)';
      analysis.exports.push({
        type: 'cjs_default',
        name,
        kind: 'class',
      });
    }

    // module.exports = identifier (not function/class literal)
    if (!cjsFuncExport && !cjsClassExport) {
      const cjsSingleExport = content.match(
        /module\.exports\s*=\s*([A-Za-z0-9_]+)\s*;?(?:\s*\/\/[^\n]*)?(?=[\s\r\n]|$)/m,
      );
      if (cjsSingleExport) {
        const name = cjsSingleExport[1];
        const kind = inferExportKind(content, name);
        analysis.exports.push({
          type: 'cjs_default',
          name,
          kind: kind !== 'unknown' ? kind : 'default',
        });
      }
    }
  }

  // Track whether any CJS default was already captured
  const hasCjsDefault = analysis.exports.some((e) => e.type === 'cjs_default');

  // module.exports = mongoose.model('ModelName', schema) or .model("ModelName", ...) — export as model
  const modelExportMatch = content.match(
    /module\.exports\s*=\s*(?:[\w.]+\s*\.\s*)?model\s*\(\s*['"]([^'"]+)['"]\s*,/,
  );
  if (modelExportMatch && !cjsObjectExport && !hasCjsDefault) {
    analysis.exports.push({
      type: 'cjs_default',
      name: modelExportMatch[1],
      kind: 'model',
    });
  } else if (
    !modelExportMatch &&
    !cjsObjectExport &&
    !hasCjsDefault &&
    /module\.exports\s*=/.test(content)
  ) {
    // module.exports = somethingElse (other call or expression) — one default export
    const callMatch = content.match(
      /module\.exports\s*=\s*(?:[\w.]+\s*\.\s*)?(\w+)\s*\(/,
    );
    const name = callMatch ? callMatch[1] + '(...)' : 'module.exports';
    analysis.exports.push({
      type: 'cjs_default',
      name,
      kind: 'default',
    });
  }

  // exports.foo = ...
  for (const m of content.matchAll(/exports\.([A-Za-z0-9_]+)\s*=/g)) {
    const name = m[1];
    const kind = inferExportKind(content, name);
    analysis.exports.push({
      type: 'cjs_named',
      name,
      kind: kind !== 'unknown' ? kind : 'named',
    });
  }

  // de-duplicate imports/exports
  analysis.imports = Array.from(
    new Map(analysis.imports.map((i) => [i.type + '|' + i.value, i])).values(),
  );

  // Normalize each import to path + imported; use full resolved path when it's a project file
  analysis.imports = analysis.imports.map((i) => {
    const names = [];
    if (i.sideEffect) names.push('(side-effect)');
    else {
      if (i.default) names.push(i.default);
      if (i.named && i.named.length)
        names.push(
          ...i.named.map((n) =>
            n.imported !== n.local ? `${n.imported} as ${n.local}` : n.local,
          ),
        );
      if (i.namespace) names.push(`* as ${i.namespace}`);
    }

    // When no binding was detected, derive a readable name from the module path
    // instead of falling back to the unhelpful "(default)"
    if (!names.length && !i.sideEffect) {
      const derived = deriveImportName(i.value);
      if (derived) names.push(derived);
    }

    const resolvedPath =
      allFilePaths.size > 0
        ? resolveImportPath(i.value, filePath, allFilePaths)
        : null;
    return {
      path: resolvedPath || i.value, // Full resolved path for project files, raw for externals
      value: i.value, // keep raw specifier for frameworkDetector
      type: i.type,
      imported: names,
      // Full path when import resolves to a file in the project
      ...(resolvedPath ? { resolvedPath } : {}),
    };
  });

  analysis.resolvedImports = Array.from(new Set(analysis.resolvedImports)); // Deduplicate
  analysis.exports = Array.from(
    new Map(
      analysis.exports.map((e) => [
        e.type + '|' + e.name + '|' + (e.kind || ''),
        e,
      ]),
    ).values(),
  );

  return analysis;
}

/**
 * Classify file behavior based on type and content patterns
 * @param {string} fileType - The file type (route, controller, service, etc.)
 * @param {string} content - File content
 * @param {object} analysis - File analysis object with routes, apiCalls, etc.
 * @returns {string} - Behavior label: 'request-handler', 'logic', 'data-layer', 'ui-render', 'http-client', 'config', 'state'
 */
function classifyBehavior(fileType, content, analysis) {
  // Ensure strings/objects are safe to test
  content = content || '';
  analysis = analysis || {};

  // Helper signals (kept simple and deterministic)
  const hasReqRes =
    /\(req\s*,\s*res\)/.test(content) ||
    /\(request\s*,\s*response\)/.test(content) ||
    /req\.(body|params|query|headers|cookies)/.test(content) ||
    /res\.(json|send|status|render|redirect)/.test(content);

  const hasRoutes =
    Array.isArray(analysis.routes) && analysis.routes.length > 0;

  const hasAxiosFetch =
    (Array.isArray(analysis.apiCalls) && analysis.apiCalls.length > 0) ||
    /axios\.(get|post|put|delete|patch)\s*\(/.test(content) ||
    /fetch\s*\(/.test(content);

  const hasMongooseSchema =
    /new\s+(mongoose\.)?Schema\s*\(/.test(content) ||
    /mongoose\.model\s*\(/.test(content);

  const hasJSXorHooks =
    /<[A-Z][a-zA-Z0-9]*[\s/>]/.test(content) ||
    /useState|useEffect|useContext|useReducer|useMemo|useCallback|useRef/.test(
      content,
    );

  // Precedence (first match wins)

  // 1) Request handler — backend routes, controllers, middleware with req/res
  if (
    fileType === 'route' ||
    fileType === 'controller' ||
    fileType === 'middleware' ||
    fileType === 'entry-point' ||
    hasRoutes ||
    hasReqRes
  ) {
    return 'request-handler';
  }

  // 2) Data layer — models, schemas
  if (fileType === 'model' || hasMongooseSchema) {
    return 'data-layer';
  }

  // 3) HTTP client — frontend API client modules that make network calls
  if (fileType === 'api-client' || (fileType === 'service' && hasAxiosFetch)) {
    return 'http-client';
  }

  // 4) State — state stores (zustand, redux, etc.)
  if (fileType === 'store') {
    return 'state';
  }

  // 5) UI render — components, pages, JSX
  if (
    fileType === 'component' ||
    fileType === 'page' ||
    fileType === 'markup' ||
    fileType === 'style' ||
    hasJSXorHooks
  ) {
    return 'ui-render';
  }

  // 6) Logic — services or utilities that do not primarily fetch
  if (fileType === 'service' || fileType === 'utility') {
    return 'logic';
  }

  // 7) Config
  if (fileType === 'config' || fileType === 'manifest') {
    return 'config';
  }

  // Default fallback: logic (conservative)
  return 'logic';
}

/**
 * Scan a project directory and return analyzed files
 * @param {string} projectPath - Path to project root
 * @returns {Promise<object>}
 */
export async function scanProject(projectPath) {
  const filePaths = await getAllFiles(projectPath);

  // Create normalized file path set for import resolution
  const normalizedFilePaths = new Set(
    filePaths.map((p) => p.replace(/\\/g, '/')),
  );

  const files = [];

  // First pass: scan all files and extract imports
  for (const relativePath of filePaths) {
    const fullPath = path.join(projectPath, relativePath);
    const content = await readFileContent(fullPath);

    // Path-based classification (Layer 1)
    const pathClassification = classifyByPath(relativePath);

    // Content-based classification (Layer 2)
    const contentClassification = content
      ? classifyByContent(content, relativePath)
      : null;

    // Merge classifications (content takes priority if confident)
    let finalType = pathClassification.type;
    let finalRole = pathClassification.role;

    if (contentClassification && contentClassification.confidence >= 0.5) {
      finalType = contentClassification.type;
      finalRole = contentClassification.role;
    }

    // Code analysis with import resolution
    const analysis = analyzeCode(content, relativePath, normalizedFilePaths);

    // Behavioral classification
    const behavior = classifyBehavior(finalType, content, analysis);

    files.push({
      path: relativePath,
      content: content || '',
      type: finalType,
      role: finalRole,
      category: pathClassification.category,
      behavior,
      analysis,
    });
  }

  // Second pass: build reverse dependencies (importedBy)
  const importedByMap = new Map();

  for (const file of files) {
    const normalizedPath = file.path.replace(/\\/g, '/');

    if (!importedByMap.has(normalizedPath)) {
      importedByMap.set(normalizedPath, new Set());
    }

    for (const importedPath of file.analysis.resolvedImports || []) {
      const normalizedImported = importedPath.replace(/\\/g, '/');
      if (normalizedImported.includes('functionExecutor')) {
        console.log(
          `[DEBUG] Mapping import: ${normalizedPath} imports ${normalizedImported}`,
        );
      }
      if (!importedByMap.has(normalizedImported)) {
        importedByMap.set(normalizedImported, new Set());
      }
      importedByMap.get(normalizedImported).add(normalizedPath);
    }
  }

  for (const file of files) {
    const normalizedPath = file.path.replace(/\\/g, '/');
    if (normalizedPath.includes('functionExecutor')) {
      console.log(
        `[DEBUG] Assigning importedBy for ${normalizedPath}. Map has: ${importedByMap.has(normalizedPath)}`,
      );
      if (importedByMap.has(normalizedPath)) {
        console.log(
          `[DEBUG] importedBy set size: ${importedByMap.get(normalizedPath).size}`,
        );
        console.log(
          `[DEBUG] Set content: ${Array.from(importedByMap.get(normalizedPath)).join(', ')}`,
        );
      }
    }
    const importedBy = Array.from(importedByMap.get(normalizedPath) || []);
    file.analysis.importedBy = importedBy;
  }

  // Framework Detection
  const frameworks = detectFrameworks(files);
  const projectType = getProjectType(frameworks);

  // Build Relationship Graph
  const filesForGraph = files.map((f) => ({
    path: f.path,
    type: f.type,
    imports: {
      files: f.analysis.resolvedImports || [],
    },
  }));
  const relationships = buildRelationshipGraph(filesForGraph);
  const relationshipStats = getRelationshipStats(relationships);

  const metadata = {
    totalFiles: filePaths.length,
    frameworks,
    projectType,
    frameworksList: [
      ...frameworks.backend,
      ...frameworks.frontend,
      ...frameworks.database,
      ...frameworks.tooling,
    ],
    relationshipStats,
  };

  // --- Feature Detection ---
  // Create a simplified file map for detection (stripping content to save memory)
  const detectionFiles = files.map((f) => ({
    path: f.path,
    type: f.type,
    role: f.role,
    category: f.category,
    routes: f.analysis.routes || [],
    imports: {
      files: f.analysis.resolvedImports || [],
    },
  }));

  const rawFeatures = detectFeatures({
    files: detectionFiles,
    relationships,
    totalFiles: files.length,
  });

  const features = {};
  Object.entries(rawFeatures).forEach(([name, feature]) => {
    features[name] = {
      name: feature.name,
      fileCount: feature.fileCount,
      allFiles: feature.allFiles,
      categorized: feature.categorized,
      sharedDependencies: feature.sharedDependencies || [],
      apiRoutes: feature.apiRoutes,
    };
  });

  return { files, metadata, relationships, features };
}
