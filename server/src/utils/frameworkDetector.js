/**
 * Framework Detection Patterns
 * Uses imports, file names, and config files to detect frameworks
 * NO AST parsing - pattern matching only
 */

const FRAMEWORK_PATTERNS = {
  // Backend Frameworks
  backend: {
    Express: {
      imports: ['express'],
      confidence: 10,
    },
    Fastify: {
      imports: ['fastify'],
      confidence: 10,
    },
    NestJS: {
      imports: ['@nestjs/core', '@nestjs/common'],
      confidence: 10,
    },
    Koa: {
      imports: ['koa'],
      confidence: 10,
    },
    Hapi: {
      imports: ['@hapi/hapi'],
      confidence: 10,
    },
    'JWT Auth': {
      imports: ['jsonwebtoken', 'jose'],
      confidence: 5,
    },
    Passport: {
      imports: ['passport'],
      confidence: 5,
    },
  },

  // Frontend Frameworks
  frontend: {
    React: {
      imports: ['react'],
      extensions: ['.jsx', '.tsx'],
      confidence: 10,
    },
    Vue: {
      imports: ['vue'],
      extensions: ['.vue'],
      confidence: 10,
    },
    Angular: {
      imports: ['@angular/core'],
      confidence: 10,
    },
    Svelte: {
      imports: ['svelte'],
      extensions: ['.svelte'],
      confidence: 10,
    },
    'Next.js': {
      imports: ['next'],
      files: ['next.config.js', 'next.config.mjs'],
      confidence: 10,
    },
    Nuxt: {
      imports: ['nuxt'],
      files: ['nuxt.config.js', 'nuxt.config.ts'],
      confidence: 10,
    },
    'React Router': {
      imports: ['react-router-dom', 'react-router'],
      confidence: 5,
    },
    'Vue Router': {
      imports: ['vue-router'],
      confidence: 5,
    },
  },

  // Database & Storage
  database: {
    MongoDB: {
      imports: ['mongodb'],
      confidence: 10,
    },
    Mongoose: {
      imports: ['mongoose'],
      confidence: 10,
    },
    Prisma: {
      imports: ['@prisma/client'],
      files: ['prisma/schema.prisma', 'schema.prisma'],
      extensions: ['.prisma'],
      confidence: 10,
    },
    Sequelize: {
      imports: ['sequelize'],
      confidence: 10,
    },
    TypeORM: {
      imports: ['typeorm'],
      confidence: 10,
    },
    PostgreSQL: {
      imports: ['pg', 'postgres'],
      confidence: 8,
    },
    MySQL: {
      imports: ['mysql', 'mysql2'],
      confidence: 8,
    },
    Redis: {
      imports: ['redis', 'ioredis'],
      confidence: 8,
    },
  },

  // Tooling & Build
  tooling: {
    Vite: {
      files: ['vite.config.js', 'vite.config.ts', 'vite.config.mjs'],
      imports: ['vite'],
      confidence: 10,
    },
    Webpack: {
      files: ['webpack.config.js', 'webpack.config.ts'],
      imports: ['webpack'],
      confidence: 10,
    },
    Axios: {
      imports: ['axios'],
      confidence: 5,
    },
    'Tailwind CSS': {
      files: ['tailwind.config.js', 'tailwind.config.ts'],
      imports: ['tailwindcss'],
      confidence: 8,
    },
    ESLint: {
      files: ['.eslintrc.js', '.eslintrc.json', 'eslint.config.js'],
      confidence: 5,
    },
    Prettier: {
      files: ['.prettierrc', '.prettierrc.js', 'prettier.config.js'],
      confidence: 5,
    },
    TypeScript: {
      files: ['tsconfig.json'],
      extensions: ['.ts', '.tsx'],
      confidence: 8,
    },
    Jest: {
      imports: ['jest', '@jest/globals'],
      files: ['jest.config.js', 'jest.config.ts'],
      confidence: 5,
    },
    Vitest: {
      imports: ['vitest'],
      files: ['vitest.config.js', 'vitest.config.ts'],
      confidence: 5,
    },
  },
};

/**
 * Detect frameworks from analyzed files
 * @param {Array} files - Array of file objects with path, imports, etc.
 * @returns {Object} - Frameworks grouped by category
 */
function detectFrameworks(files) {
  const detectedFrameworks = {
    backend: new Map(),
    frontend: new Map(),
    database: new Map(),
    tooling: new Map(),
  };

  const allImports = new Set();
  const allFilePaths = new Set();
  const allExtensions = new Set();

  files.forEach((file) => {
    allFilePaths.add(file.path.toLowerCase());

    const ext = file.path.match(/\.[^.]+$/)?.[0];
    if (ext) allExtensions.add(ext);

    if (file.analysis?.imports) {
      file.analysis.imports.forEach((imp) => {
        const importValue = imp.value;
        if (!importValue) return;
        const packageName = importValue.startsWith('@')
          ? importValue.split('/').slice(0, 2).join('/')
          : importValue.split('/')[0];
        if (packageName) {
          allImports.add(packageName);
        }
      });
    }
  });

  for (const [category, frameworks] of Object.entries(FRAMEWORK_PATTERNS)) {
    for (const [frameworkName, patterns] of Object.entries(frameworks)) {
      let score = 0;

      if (patterns.imports) {
        const matchingImports = patterns.imports.filter((imp) =>
          allImports.has(imp),
        );
        if (matchingImports.length > 0) {
          score += patterns.confidence * matchingImports.length;
        }
      }

      if (patterns.files) {
        const matchingFiles = patterns.files.filter((fileName) =>
          allFilePaths.has(fileName.toLowerCase()),
        );
        if (matchingFiles.length > 0) {
          score += patterns.confidence * matchingFiles.length;
        }
      }

      if (patterns.extensions) {
        const matchingExts = patterns.extensions.filter((ext) =>
          allExtensions.has(ext),
        );
        if (matchingExts.length > 0) {
          score += patterns.confidence * 0.5; // Lower weight for extensions
        }
      }

      if (score > 0) {
        detectedFrameworks[category].set(frameworkName, score);
      }
    }
  }

  const result = {
    backend: Array.from(detectedFrameworks.backend.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name),
    frontend: Array.from(detectedFrameworks.frontend.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name),
    database: Array.from(detectedFrameworks.database.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name),
    tooling: Array.from(detectedFrameworks.tooling.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name),
  };

  return result;
}

/**
 * Get project type based on detected frameworks
 * @param {Object} frameworks - Detected frameworks object
 * @returns {string} - Project type
 */
function getProjectType(frameworks) {
  const hasBackend = frameworks.backend.length > 0;
  const hasFrontend = frameworks.frontend.length > 0;
  const hasDatabase = frameworks.database.length > 0;

  if (hasBackend && hasFrontend) {
    return 'fullstack';
  } else if (hasBackend || hasDatabase) {
    return 'backend';
  } else if (hasFrontend) {
    return 'frontend';
  }

  return 'unknown';
}

export { detectFrameworks, getProjectType, FRAMEWORK_PATTERNS };
