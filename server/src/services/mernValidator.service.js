import fs from 'fs/promises';
import path from 'path';

const BACKEND_FRAMEWORKS = [
  'express',
  'fastify',
  '@nestjs/core',
  'koa',
  'hapi',
  '@hapi/hapi',
];
const FRONTEND_FRAMEWORKS = [
  'react',
  'vue',
  'angular',
  '@angular/core',
  'svelte',
  'next',
  '@nuxt/nuxt',
  'nuxt',
];
const DB_DRIVERS = [
  'mongoose',
  'mongodb',
  'pg',
  'mysql2',
  'mysql',
  '@prisma/client',
  'sequelize',
  'typeorm',
  'ioredis',
  'redis',
];

/**
 * Option 2: Balanced MERN Validation
 * 1. Parse package.json files
 * 2. Scan entry points for verification
 * 3. Verify imports match dependencies
 *
 * @param {string} projectPath - Extracted/cloned project path
 * @returns {Object} { isValid, reason, details, detected, suspiciousImports }
 */
export async function validateMERNProjectBalanced(projectPath) {
  try {
    // ─── PHASE 1: Parse package.json (standard locations first, then recursive) ───
    let allDeps = await parseAllPackageJsons(projectPath);

    // If nothing found in standard locations, recursively scan entire project
    if (Object.keys(allDeps).length === 0) {
      allDeps = await findAllPackageJsonsRecursive(projectPath);
    }

    if (Object.keys(allDeps).length === 0) {
      return {
        isValid: false,
        reason: 'No Dependencies Found',
        details:
          'Could not find any package.json files in your project. Please ensure your project has at least one package.json file with MERN dependencies.',
      };
    }

    // ─── Check if basic frameworks exist ───
    const hasBackend = BACKEND_FRAMEWORKS.some((fw) => fw in allDeps);
    const hasFrontend = FRONTEND_FRAMEWORKS.some((fw) => fw in allDeps);
    const hasDatabase = DB_DRIVERS.some((db) => db in allDeps);

    const detectedBackend = Object.keys(allDeps).find((dep) =>
      BACKEND_FRAMEWORKS.includes(dep),
    );
    const detectedFrontend = Object.keys(allDeps).find((dep) =>
      FRONTEND_FRAMEWORKS.includes(dep),
    );
    const detectedDatabase = Object.keys(allDeps).find((dep) =>
      DB_DRIVERS.includes(dep),
    );

    // Quick fail if missing any core layer
    if (!hasBackend) {
      return {
        isValid: false,
        reason: 'Missing Backend Framework',
        details: `Expected one of: ${BACKEND_FRAMEWORKS.join(', ')}. Found dependencies: ${Object.keys(allDeps).slice(0, 10).join(', ')}${Object.keys(allDeps).length > 10 ? '...' : ''}`,
        detected: {
          backend: false,
          frontend: hasFrontend,
          database: hasDatabase,
        },
      };
    }

    if (!hasFrontend) {
      return {
        isValid: false,
        reason: 'Missing Frontend Framework',
        details: `Expected one of: ${FRONTEND_FRAMEWORKS.join(', ')}. Found dependencies: ${Object.keys(allDeps).slice(0, 10).join(', ')}${Object.keys(allDeps).length > 10 ? '...' : ''}`,
        detected: {
          backend: detectedBackend || true,
          frontend: false,
          database: hasDatabase,
        },
      };
    }

    if (!hasDatabase) {
      return {
        isValid: false,
        reason: 'Missing Database Driver',
        details: `Expected one of: ${DB_DRIVERS.join(', ')}. Found dependencies: ${Object.keys(allDeps).slice(0, 10).join(', ')}${Object.keys(allDeps).length > 10 ? '...' : ''}`,
        detected: {
          backend: detectedBackend || true,
          frontend: detectedFrontend || true,
          database: false,
        },
      };
    }

    // ─── PHASE 2: Scan entry points (can be anywhere in project) ───
    const entryPoints = await findEntryPointsRecursive(projectPath);

    if (entryPoints.length === 0) {
      // ✅ If we have MERN deps but no entry points, still accept (might be library)
      // Just return valid since we found all three layers
      return {
        isValid: true,
        reason: 'Valid MERN Stack Project',
        details:
          'Project has all required MERN dependencies (backend, frontend, database). Entry points not required.',
        detected: {
          backend: detectedBackend,
          frontend: detectedFrontend,
          database: detectedDatabase,
        },
        entryPointsFound: 0,
      };
    }

    // ─── PHASE 3: Verify imports match dependencies (optional check) ───
    const importValidation = await verifyImportsMatchDeps(
      projectPath,
      entryPoints,
      allDeps,
    );

    // Only fail on import validation if we have MANY suspicious imports (>15)
    if (importValidation.suspiciousImports?.length > 15) {
      return {
        isValid: false,
        reason: 'Too Many Unresolved Imports',
        details: `Found ${importValidation.suspiciousImports.length} imports not in dependencies. Project may be incomplete or corrupted. Try running 'npm install' in the project root.`,
        suspiciousImports: importValidation.suspiciousImports.slice(0, 5),
        detected: {
          backend: detectedBackend,
          frontend: detectedFrontend,
          database: detectedDatabase,
        },
      };
    }

    // ✅ All checks passed!
    return {
      isValid: true,
      reason: 'Valid MERN Stack Project',
      detected: {
        backend: detectedBackend,
        frontend: detectedFrontend,
        database: detectedDatabase,
      },
      entryPointsFound: entryPoints.length,
    };
  } catch (err) {
    return {
      isValid: false,
      reason: 'Validation error',
      details: err.message,
    };
  }
}

/**
 * Parse all package.json files in project (root + common monorepo patterns)
 */
async function parseAllPackageJsons(projectPath) {
  const allDeps = {};
  const pkgPaths = [
    path.join(projectPath, 'package.json'),
    path.join(projectPath, 'server', 'package.json'),
    path.join(projectPath, 'client', 'package.json'),
    path.join(projectPath, 'backend', 'package.json'),
    path.join(projectPath, 'frontend', 'package.json'),
    path.join(projectPath, 'packages', 'backend', 'package.json'),
    path.join(projectPath, 'packages', 'frontend', 'package.json'),
    path.join(projectPath, 'apps', 'server', 'package.json'),
    path.join(projectPath, 'apps', 'client', 'package.json'),
  ];

  for (const pkgPath of pkgPaths) {
    try {
      const content = await fs.readFile(pkgPath, 'utf-8');
      const pkg = JSON.parse(content);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      Object.assign(allDeps, deps);
    } catch (err) {
      // File doesn't exist or not JSON, skip
    }
  }

  return allDeps;
}

/**
 * Find entry point files in project
 */
async function findEntryPoints(projectPath) {
  const candidates = [
    'server.js',
    'src/server.js',
    'dist/server.js',
    'index.js',
    'src/index.js',
    'app.js',
    'src/app.js',
    'backend/src/index.js',
    'backend/index.js',
    'backend/src/server.js',
    'src/App.jsx',
    'src/App.tsx',
    'src/main.jsx',
    'src/main.ts',
    'src/index.jsx',
    'src/index.ts',
    'frontend/src/App.jsx',
    'frontend/src/main.jsx',
    'frontend/src/index.jsx',
    'frontend/src/main.tsx',
    'client/src/App.jsx',
    'client/src/main.jsx',
  ];

  const found = [];
  for (const candidate of candidates) {
    const fullPath = path.join(projectPath, candidate);
    try {
      await fs.access(fullPath);
      found.push(fullPath);
    } catch {
      // File doesn't exist, skip
    }
  }

  return found;
}

/**
 * Read first 500 lines of entry points and extract imports
 * Verify they match dependencies
 */
async function verifyImportsMatchDeps(projectPath, entryPoints, allDeps) {
  const suspiciousImports = [];
  let filesScanned = 0;

  for (const filePath of entryPoints) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n').slice(0, 500); // First 500 lines
      filesScanned++;

      // Extract imports (handle: import, require, dynamic imports)
      const importRegex =
        /(?:import|require)\s+(?:.*\s+from\s+)?['"`]([^'"`]+)['"`]/g;

      for (const line of lines) {
        let match;
        while ((match = importRegex.exec(line)) !== null) {
          const importPath = match[1];

          // Extract package name (handle scoped packages like @nestjs/core)
          const packageName = importPath.startsWith('@')
            ? importPath.split('/').slice(0, 2).join('/')
            : importPath.split('/')[0];

          // Skip relative imports (./something, ../something)
          if (packageName.startsWith('.')) continue;

          // Check if it's in dependencies
          if (!(packageName in allDeps)) {
            // Allow common built-ins and common patterns
            if (!isBuiltInOrIgnorable(packageName)) {
              suspiciousImports.push({
                file: path.relative(projectPath, filePath),
                import: packageName,
              });
            }
          }
        }
      }
    } catch (err) {
      // Error reading file, skip
    }
  }

  // If we found many suspicious imports, it's likely corrupted/incomplete
  if (suspiciousImports.length > 15) {
    return {
      suspiciousImports,
    };
  }

  return {
    suspiciousImports: suspiciousImports.length > 0 ? suspiciousImports : [],
  };
}

/**
 * Check if import is a built-in or ignorable module
 */
function isBuiltInOrIgnorable(packageName) {
  // Node.js built-ins
  const builtins = [
    'fs',
    'path',
    'http',
    'https',
    'crypto',
    'os',
    'util',
    'stream',
    'events',
    'assert',
    'url',
    'querystring',
    'buffer',
    'process',
    'child_process',
  ];

  // Common env/config patterns
  const ignorable = ['dotenv', 'process', '$ENV', 'process.env'];

  return (
    builtins.includes(packageName) ||
    ignorable.includes(packageName) ||
    packageName.startsWith('process') ||
    packageName.startsWith('$ENV')
  );
}

/**
 * Recursively find ALL package.json files in project (used when standard locations fail)
 */
async function findAllPackageJsonsRecursive(projectPath, maxDepth = 5) {
  const allDeps = {};
  const visited = new Set();

  async function scan(dirPath, depth) {
    if (depth > maxDepth) return;
    if (visited.has(dirPath)) return;
    visited.add(dirPath);

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        // Skip node_modules, .git, and common junk folders
        if (
          [
            'node_modules',
            '.git',
            '.next',
            'dist',
            'build',
            '.cache',
            'coverage',
          ].includes(entry.name)
        ) {
          continue;
        }

        const fullPath = path.join(dirPath, entry.name);

        // Check for package.json
        if (entry.name === 'package.json') {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const pkg = JSON.parse(content);
            const deps = { ...pkg.dependencies, ...pkg.devDependencies };
            Object.assign(allDeps, deps);
          } catch (err) {
            // Skip invalid package.json
          }
        }

        // Recurse into directories
        if (entry.isDirectory()) {
          await scan(fullPath, depth + 1);
        }
      }
    } catch (err) {
      // Skip inaccessible directories
    }
  }

  await scan(projectPath, 0);
  return allDeps;
}

/**
 * Recursively find entry point files anywhere in project
 */
async function findEntryPointsRecursive(projectPath, maxDepth = 4) {
  const found = [];
  const visited = new Set();

  const entryPointPatterns = /^(server|app|index|main)\.(js|jsx|ts|tsx)$/i;

  async function scan(dirPath, depth) {
    if (depth > maxDepth) return;
    if (visited.has(dirPath)) return;
    visited.add(dirPath);

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        // Skip node_modules, .git, and common junk folders
        if (
          [
            'node_modules',
            '.git',
            '.next',
            'dist',
            'build',
            '.cache',
            'coverage',
          ].includes(entry.name)
        ) {
          continue;
        }

        const fullPath = path.join(dirPath, entry.name);

        // Check for entry point files
        if (entry.isFile() && entryPointPatterns.test(entry.name)) {
          found.push(fullPath);
        }

        // Recurse into src directories and common app folders
        if (
          entry.isDirectory() &&
          ['src', 'app', 'lib', 'source'].includes(entry.name.toLowerCase())
        ) {
          await scan(fullPath, depth + 1);
        }
      }
    } catch (err) {
      // Skip inaccessible directories
    }
  }

  await scan(projectPath, 0);
  return found;
}

export default {
  validateMERNProjectBalanced,
};
