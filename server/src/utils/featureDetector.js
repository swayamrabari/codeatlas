/**
 * FEATURE DETECTION ALGORITHM
 *
 * This algorithm analyzes a codebase's structure and relationships to automatically
 * group files into logical features without using AI.
 *
 * INPUT: JSON with file metadata and relationships (from static code analysis)
 * OUTPUT: Features with grouped files, categorized by frontend/backend
 */

/**
 * STEP 1: IDENTIFY HUBS
 *
 * "Hubs" are files that serve as entry points for features:
 * - Controllers: Backend business logic
 * - Route handlers: API endpoint definitions
 * - Pages: Frontend route components
 * - API modules: Frontend API clients
 *
 * These files typically have clear naming patterns and are the "anchors" of features.
 */
function identifyHubs(files) {
  const hubs = [];

  files.forEach((file) => {
    // Normalize path separators (Windows vs Unix)
    const path = file.path.replace(/\\/g, '/');

    // Detect hub types by path patterns (broad matching)
    const isController = path.includes('/controllers/');

    // Next.js & Standard Pages
    // 1. Standard Pages: /pages/User.tsx
    // 2. Next.js App Router: /app/user/page.tsx
    // Exclude Next.js specials (_app, _document) unless they are the specific feature hubs (usually not)
    const isPagesPage =
      path.includes('/pages/') &&
      /\.(tsx|jsx)$/.test(path) &&
      !/\/_(app|document|error)\./.test(path);
    const isAppPage = /\/app\/(?:.*\/)?page\.(tsx|jsx)$/.test(path);
    const isPage = isPagesPage || isAppPage;

    // API Modules & Routes
    // Next.js App Router API: /app/api/auth/route.ts
    const isAppRoute = /\/app\/(?:.*\/)?route\.(ts|js)$/.test(path);

    const isAPIModule =
      /\/(api)\//.test(path) &&
      (path.includes('client/') ||
        path.includes('frontend/') ||
        path.includes('src/api/') ||
        /\/app\/api\//.test(path)) &&
      !/index\.(ts|js|tsx|jsx)$/.test(path) &&
      !isAppRoute; // route.ts is handled as 'route' type below

    const isRouteHandler =
      (file.type === 'route' && file.routes?.length > 0) ||
      path.includes('/routes/') ||
      isAppRoute;

    if (isController || isPage || isAPIModule || isRouteHandler) {
      hubs.push({
        path: path,
        type: isController
          ? 'controller'
          : isPage
            ? 'page'
            : isAPIModule
              ? 'api'
              : 'route',
        routes: file.routes || [],
        imports: file.imports?.files || [],
      });
    }
  });

  return hubs;
}

/**
 * STEP 2: EXTRACT FEATURE NAMES
 *
 * Use naming conventions to determine which feature a hub belongs to.
 * Examples:
 * - server/controllers/budgetsController.js → "budgets"
 * - client/src/pages/Budget.tsx → "budget"
 * - client/src/api/budgets.ts → "budgets"
 */
function extractFeatureName(path) {
  const patterns = [
    // Controllers: authController.js → "auth"
    {
      regex: /controllers[\/](\w+?)Controller\./i,
      transform: (s) => s.toLowerCase(),
    },

    // Next.js App Router (Page/Route/Layout): app/dashboard/page.tsx → "dashboard"
    // Also handles Route Groups: app/(auth)/login/page.tsx -> "login"
    {
      regex:
        /app[\/](?:.*[\/])?([^\/]+?)[\/](?:page|route|layout|loading|error|not-found)\.(tsx|jsx|ts|js)/i,
      transform: (s) => s.replace(/^\(|\)$/g, '').toLowerCase(),
    },

    // Next.js Pages Router (Nested Index): pages/dashboard/index.tsx → "dashboard"
    {
      regex: /pages[\/](?:.*[\/])?([^\/]+?)[\/]index\.(tsx|jsx)/i,
      transform: (s) => s.toLowerCase(),
    },

    // Pages: Budget.tsx, Login.jsx → "budget", "login"
    {
      regex: /pages[\/](?:.*[\/])?(\w+?)\.(tsx|jsx)/i,
      transform: (s) => s.toLowerCase(),
    },

    // API modules: budgets.ts, auth.js → "budgets", "auth"
    {
      regex: /api[\/](\w+?)\.(ts|js|tsx|jsx)/i,
      transform: (s) => s.toLowerCase(),
    },

    // Routes: authRoutes.js, userRoutes.ts, auth.js → "auth", "user"
    {
      regex: /routes[\/](\w+?)(?:Routes|Route)?\.(js|ts)/i,
      transform: (s) => s.toLowerCase(),
    },
  ];

  for (const { regex, transform } of patterns) {
    const match = path.match(regex);
    if (match) {
      return transform(match[1]);
    }
  }

  return null;
}

/**
 * STEP 3: DETECT FEATURE RELATIONSHIPS
 *
 * Some features should be merged together based on domain knowledge.
 * For example, Login, Register, ForgotPassword pages all belong to "auth" feature.
 *
 * This mapping can be expanded based on your codebase conventions.
 */
function detectFeatureRelationships(featureName) {
  const relationships = {
    // Auth-related pages
    login: 'auth',
    register: 'auth',
    signup: 'auth',
    signin: 'auth',
    verify: 'auth',
    forgotpassword: 'auth',
    verifyforgotpassword: 'auth',
    resetpassword: 'auth',

    // Home / dashboard
    home: 'dashboard',
    overview: 'dashboard',

    // Insights
    insight: 'insights',
    analytics: 'insights',
    stats: 'insights',
  };

  return relationships[featureName] || featureName;
}

/**
 * Normalize singular/plural feature names to a canonical form.
 * Handles common English patterns: "project" ↔ "projects", "entry" ↔ "entries", etc.
 * The canonical form is always the singular version.
 */
function normalizePluralSingular(name) {
  // Irregular plurals (add more as needed)
  const irregulars = {
    people: 'person',
    children: 'child',
    mice: 'mouse',
    men: 'man',
    women: 'woman',
    data: 'data',
    media: 'media',
  };

  if (irregulars[name]) return irregulars[name];

  // -ies → -y (categories → category, entries → entry, buddies → buddy)
  if (name.endsWith('ies') && name.length > 4) {
    return name.slice(0, -3) + 'y';
  }

  // -ses, -xes, -zes, -ches, -shes → strip -es (statuses → status, boxes → box)
  if (
    (name.endsWith('ses') ||
      name.endsWith('xes') ||
      name.endsWith('zes') ||
      name.endsWith('ches') ||
      name.endsWith('shes')) &&
    name.length > 4
  ) {
    return name.slice(0, -2);
  }

  // Standard plural → singular: remove trailing 's'
  // Exclude words ending in 'ss' (e.g., 'class', 'address') and short names
  if (
    name.endsWith('s') &&
    !name.endsWith('ss') &&
    !name.endsWith('us') &&
    name.length > 3
  ) {
    return name.slice(0, -1);
  }

  return name;
}

/**
 * STEP 4: GROUP HUBS BY FEATURE
 *
 * Group all identified hubs into features based on their extracted names
 * and relationship mappings. Merges singular/plural variants automatically.
 */
/**
 * Derive the plural form of a singular name.
 * Handles common English patterns.
 */
function toPlural(singular) {
  if (singular.endsWith('y') && !/[aeiou]y$/.test(singular)) {
    return singular.slice(0, -1) + 'ies';
  }
  if (/(?:s|x|z|ch|sh)$/.test(singular)) {
    return singular + 'es';
  }
  return singular + 's';
}

function groupHubsByFeature(hubs) {
  const features = {};
  // Track how many times each raw name appears (for frequency-based naming)
  const nameFrequency = {};
  // Map from singular key → list of raw names used
  const singularToRawNames = {};

  hubs.forEach((hub) => {
    let featureName = extractFeatureName(hub.path);

    if (featureName) {
      // Map to canonical feature name (e.g., "login" → "auth")
      let canonicalName = detectFeatureRelationships(featureName);

      // Get the singular form as the merge key
      const singular = normalizePluralSingular(canonicalName);
      const plural = toPlural(singular);

      // Track frequency of the raw canonical name
      if (!nameFrequency[singular]) nameFrequency[singular] = {};
      nameFrequency[singular][canonicalName] =
        (nameFrequency[singular][canonicalName] || 0) + 1;

      // Use singular as the internal merge key
      // If the singular form already exists, use that; otherwise if plural exists, merge into it
      let mergeKey;
      if (features[singular]) {
        mergeKey = singular;
      } else if (features[plural]) {
        // Re-key: rename the existing feature entry from plural to singular
        features[singular] = features[plural];
        delete features[plural];
        mergeKey = singular;
      } else {
        mergeKey = singular;
      }

      // Initialize feature if it doesn't exist
      if (!features[mergeKey]) {
        features[mergeKey] = {
          name: mergeKey, // Temporary; will be replaced by best name below
          hubs: [],
          hubPaths: {},
        };
      }

      // Add hub to feature
      features[mergeKey].hubs.push(hub);

      // Track hub paths by type (for reporting)
      if (!features[mergeKey].hubPaths[hub.type]) {
        features[mergeKey].hubPaths[hub.type] = [];
      }
      features[mergeKey].hubPaths[hub.type].push(hub.path);
    }
  });

  // Final pass: pick the best display name for each feature.
  // Use the most frequently occurring raw name variant.
  const renamed = {};
  Object.entries(features).forEach(([singularKey, feature]) => {
    const freqs = nameFrequency[singularKey] || {};
    // Find the name variant with the highest frequency
    let bestName = singularKey;
    let bestCount = 0;
    Object.entries(freqs).forEach(([name, count]) => {
      if (count > bestCount) {
        bestCount = count;
        bestName = name;
      }
    });
    feature.name = bestName;
    renamed[bestName] = feature;
  });

  return renamed;
}

/**
 * SHARED INFRASTRUCTURE DETECTION
 *
 * Files matching these patterns are generic/shared across the entire codebase.
 * They are tracked separately as "sharedDependencies" rather than polluting
 * each feature's file list. We also do NOT traverse into them (their own
 * transitive imports are irrelevant to feature grouping).
 *
 * Patterns are intentionally conservative — only clear-cut library/utility
 * directories that appear in virtually every JS/TS codebase.
 */
const SHARED_INFRA_PATTERNS = [
  /\/components\/ui\//i, // Generic UI primitives (shadcn, radix, etc.)
  /\/lib\/utils\.(ts|js|tsx|jsx)$/i, // Utility helpers (cn, clsx, formatters)
  /\/api\/index\.(ts|js|tsx|jsx)$/i, // API client singleton / base setup
];

/**
 * Check whether a file path matches a shared-infrastructure pattern.
 */
function isSharedInfrastructure(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  return SHARED_INFRA_PATTERNS.some((p) => p.test(normalized));
}

/**
 * STEP 5: FIND CONNECTED FILES (GRAPH TRAVERSAL)
 *
 * Starting from a hub, traverse the import graph to find all related files.
 * Uses depth-limited traversal to avoid including too many shared utilities.
 *
 * maxDepth = 2 means:
 * - Depth 0: The hub itself
 * - Depth 1: Files directly imported by the hub
 * - Depth 2: Files imported by those files
 *
 * Shared infrastructure files (components/ui/*, lib/utils, api/index) are
 * collected separately and NOT traversed into, keeping features lean.
 */
function findConnectedFiles(hubPath, relationships, files, maxDepth = 2) {
  const connected = new Set([hubPath]);
  const sharedDeps = new Set();
  const visited = new Set();

  function traverse(path, depth) {
    // Stop conditions
    if (depth > maxDepth || visited.has(path)) return;
    visited.add(path);

    const normalizedPath = path.replace(/\\/g, '/');

    // Collect all outgoing edges from this file
    const outgoing = new Set();

    // Method 1: Use relationship graph (from/to connections)
    relationships.forEach((rel) => {
      const fromNorm = rel.from.replace(/\\/g, '/');
      const toNorm = rel.to.replace(/\\/g, '/');
      if (fromNorm === normalizedPath) {
        outgoing.add(toNorm);
      }
    });

    // Method 2: Use file metadata imports
    const file = files.find(
      (f) => f.path.replace(/\\/g, '/') === normalizedPath,
    );
    if (file?.imports?.files) {
      file.imports.files.forEach((importedFile) => {
        outgoing.add(importedFile.replace(/\\/g, '/'));
      });
    }

    // Process each outgoing edge
    outgoing.forEach((targetPath) => {
      if (connected.has(targetPath) || sharedDeps.has(targetPath)) return;

      if (isSharedInfrastructure(targetPath)) {
        // Track as a shared dependency but do NOT traverse deeper.
        // This prevents the entire UI library / utility tree from
        // being pulled into every feature.
        sharedDeps.add(targetPath);
      } else {
        connected.add(targetPath);
        traverse(targetPath, depth + 1);
      }
    });
  }

  traverse(hubPath, 0);
  return { files: Array.from(connected), sharedDeps: Array.from(sharedDeps) };
}

/**
 * STEP 6: EXPAND FEATURES WITH CONNECTED FILES
 *
 * For each feature, expand it by finding all files connected to its hubs.
 * Then categorize those files by type (frontend, backend, models, etc.)
 */
function expandFeatures(features, relationships, files) {
  Object.keys(features).forEach((featureName) => {
    const feature = features[featureName];
    const allConnected = new Set();
    const allSharedDeps = new Set();

    // For each hub in this feature, find all connected files
    feature.hubs.forEach((hub) => {
      const { files: connectedFiles, sharedDeps } = findConnectedFiles(
        hub.path,
        relationships,
        files,
        2,
      );
      connectedFiles.forEach((file) => allConnected.add(file));
      sharedDeps.forEach((dep) => allSharedDeps.add(dep));
    });

    // Sibling discovery: if any connected file is inside a components/<subdir>/,
    // also include sibling files in the same directory. This ensures all chart
    // components (e.g., all files in components/charts/) are grouped together
    // even if some weren't reached via import resolution.
    //
    // IMPORTANT: Shared component directories (e.g., components/ui/) are
    // excluded — otherwise every feature would absorb the entire UI library.
    const siblingDirs = new Set();
    allConnected.forEach((filePath) => {
      const match = filePath.match(/^(.+\/components\/[^/]+)\//);
      if (match) {
        const dir = match[1];
        // Skip generic shared component directories
        if (!/\/components\/ui$/i.test(dir)) {
          siblingDirs.add(dir);
        }
      }
    });
    if (siblingDirs.size > 0) {
      files.forEach((f) => {
        const fp = f.path.replace(/\\/g, '/');
        for (const dir of siblingDirs) {
          if (fp.startsWith(dir + '/') && !allConnected.has(fp)) {
            allConnected.add(fp);
          }
        }
      });
    }

    // Store all files in this feature
    feature.allFiles = Array.from(allConnected);
    feature.fileCount = feature.allFiles.length;

    // Store shared dependencies separately (UI components, utils, etc.)
    feature.sharedDependencies = Array.from(allSharedDeps);

    // Initialize categorization buckets
    const categorized = {
      frontend: [],
      backend: [],
      shared: [],
      models: [],
      routes: [],
      controllers: [],
      pages: [],
      components: [],
      api: [],
      utils: [],
      middleware: [],
      config: [],
      stores: [],
      services: [],
    };

    // Categorize each file — use path-based detection as primary signal
    feature.allFiles.forEach((filePath) => {
      const file = files.find((f) => f.path.replace(/\\/g, '/') === filePath);
      if (!file) return;

      // Primary: detect frontend/backend by top-level directory in path
      const pathLower = filePath.toLowerCase();
      const pathIsFrontend =
        /^(client|frontend)\//.test(pathLower) ||
        /\/(client|frontend)\//.test(pathLower);
      const pathIsBackend =
        /^(server|backend)\//.test(pathLower) ||
        /\/(server|backend)\//.test(pathLower);

      // Use path-based detection first, fall back to scanner category
      const cat = file.category || '';
      const isFrontend =
        pathIsFrontend || (!pathIsBackend && cat === 'frontend');
      const isBackend = pathIsBackend || (!pathIsFrontend && cat === 'backend');

      // Frontend / Backend top-level buckets
      if (isFrontend) categorized.frontend.push(filePath);
      if (isBackend) categorized.backend.push(filePath);

      // Sub-category by path patterns (works regardless of root dir name)
      if (filePath.includes('/pages/')) categorized.pages.push(filePath);
      if (filePath.includes('/components/'))
        categorized.components.push(filePath);
      if (filePath.includes('/api/') && isFrontend)
        categorized.api.push(filePath);
      if (filePath.includes('/store/') || filePath.includes('/stores/'))
        categorized.stores.push(filePath);
      if (filePath.includes('/models/') || filePath.includes('/schemas/'))
        categorized.models.push(filePath);
      if (filePath.includes('/routes/')) categorized.routes.push(filePath);
      if (filePath.includes('/controllers/'))
        categorized.controllers.push(filePath);
      if (
        filePath.includes('/middleware/') ||
        filePath.includes('/middlewares/')
      )
        categorized.middleware.push(filePath);
      if (
        filePath.includes('/utils/') ||
        filePath.includes('/helpers/') ||
        filePath.includes('/lib/')
      )
        categorized.utils.push(filePath);
      if (filePath.includes('/config/') || filePath.includes('/configs/'))
        categorized.config.push(filePath);
      if (filePath.includes('/services/')) categorized.services.push(filePath);

      // Mark shared files
      if (cat === 'shared') {
        categorized.shared.push(filePath);
      }
    });

    feature.categorized = categorized;

    // Extract API routes from all hubs
    feature.apiRoutes = feature.hubs.flatMap((h) => h.routes || []);
  });

  return features;
}

/**
 * MAIN FUNCTION: Detect Features
 *
 * This is the entry point that orchestrates all the steps above.
 */
function detectFeatures(analysisData) {
  console.log('Starting feature detection...\n');

  // Step 1: Identify hubs
  const hubs = identifyHubs(analysisData.files);
  console.log(`✓ Found ${hubs.length} hubs`);

  // Step 2-4: Group hubs by feature
  let features = groupHubsByFeature(hubs);
  console.log(`✓ Identified ${Object.keys(features).length} unique features`);

  // Step 5-6: Expand features with connected files
  features = expandFeatures(
    features,
    analysisData.relationships,
    analysisData.files,
  );
  console.log(`✓ Expanded features with relationships`);

  // Calculate coverage
  const filesInFeatures = new Set();
  Object.values(features).forEach((feature) => {
    feature.allFiles.forEach((file) => filesInFeatures.add(file));
  });

  const coverage = (
    (filesInFeatures.size / analysisData.totalFiles) *
    100
  ).toFixed(1);
  console.log(
    `\n📊 Coverage: ${filesInFeatures.size}/${analysisData.totalFiles} files (${coverage}%)`,
  );

  return features;
}

export {
  identifyHubs,
  extractFeatureName,
  detectFeatureRelationships,
  normalizePluralSingular,
  toPlural,
  groupHubsByFeature,
  findConnectedFiles,
  isSharedInfrastructure,
  expandFeatures,
  detectFeatures,
};
