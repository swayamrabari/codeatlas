/**
 * Relationship Graph Builder
 * Uses existing scan data (file.path, file.imports.files, file.type)
 * NO AST, NO filesystem reads
 */

/**
 * Layer transition rules for inferring "uses" relationships
 * Maps file types to their typical downstream dependencies
 */
const LAYER_TRANSITIONS = {
  route: ['controller', 'service', 'middleware'],
  controller: ['service', 'model', 'utility'],
  service: ['model', 'utility'],
  middleware: ['service', 'utility'],
  page: ['component', 'hook', 'service', 'utility'],
  component: ['component', 'hook', 'utility'],
};

/**
 * Build relationship graph from scanned files
 * @param {Array} files - Array of scanned file objects with path, imports.files, and type
 * @returns {Array} - Array of relationship objects { from, to, type }
 */
function buildRelationshipGraph(files) {
  const relationships = [];
  const fileTypeMap = new Map();

  // Build a map of file paths to their types for quick lookup
  files.forEach((file) => {
    const normalizedPath = file.path.replace(/\\/g, '/');
    fileTypeMap.set(normalizedPath, file.type);
  });

  // Process each file
  files.forEach((file) => {
    const fromPath = file.path.replace(/\\/g, '/');
    const fromType = file.type;

    // 1. Direct import relationships
    const importedFiles = file.imports?.files || [];
    importedFiles.forEach((importedPath) => {
      const normalizedImport = importedPath.replace(/\\/g, '/');
      relationships.push({
        from: fromPath,
        to: normalizedImport,
        type: 'imports',
      });
    });

    // 2. Infer "uses" relationships based on layer transitions
    const allowedTargetTypes = LAYER_TRANSITIONS[fromType];
    if (allowedTargetTypes && allowedTargetTypes.length > 0) {
      importedFiles.forEach((importedPath) => {
        const normalizedImport = importedPath.replace(/\\/g, '/');
        const targetType = fileTypeMap.get(normalizedImport);

        // Only add "uses" if it matches a known layer transition
        if (targetType && allowedTargetTypes.includes(targetType)) {
          // Check if we don't already have this exact relationship
          const existingUses = relationships.find(
            (r) =>
              r.from === fromPath &&
              r.to === normalizedImport &&
              r.type === 'uses',
          );
          if (!existingUses) {
            relationships.push({
              from: fromPath,
              to: normalizedImport,
              type: 'uses',
            });
          }
        }
      });
    }
  });

  return relationships;
}

/**
 * Get relationships filtered by type
 * @param {Array} relationships - Full relationship array
 * @param {string} type - 'imports' or 'uses'
 * @returns {Array} - Filtered relationships
 */
function filterRelationshipsByType(relationships, type) {
  return relationships.filter((r) => r.type === type);
}

/**
 * Get all files that a specific file depends on (outgoing)
 * @param {Array} relationships - Full relationship array
 * @param {string} filePath - Path of the file
 * @returns {Array} - Array of file paths this file depends on
 */
function getDependencies(relationships, filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  return relationships
    .filter((r) => r.from === normalized)
    .map((r) => ({ path: r.to, type: r.type }));
}

/**
 * Get all files that depend on a specific file (incoming)
 * @param {Array} relationships - Full relationship array
 * @param {string} filePath - Path of the file
 * @returns {Array} - Array of file paths that depend on this file
 */
function getDependents(relationships, filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  return relationships
    .filter((r) => r.to === normalized)
    .map((r) => ({ path: r.from, type: r.type }));
}

/**
 * Get relationship statistics
 * @param {Array} relationships - Full relationship array
 * @returns {Object} - Statistics about the relationships
 */
function getRelationshipStats(relationships) {
  const importCount = relationships.filter((r) => r.type === 'imports').length;
  const usesCount = relationships.filter((r) => r.type === 'uses').length;

  const uniqueFiles = new Set();
  relationships.forEach((r) => {
    uniqueFiles.add(r.from);
    uniqueFiles.add(r.to);
  });

  return {
    totalRelationships: relationships.length,
    importRelationships: importCount,
    usesRelationships: usesCount,
    filesInGraph: uniqueFiles.size,
  };
}

export {
  buildRelationshipGraph,
  filterRelationshipsByType,
  getDependencies,
  getDependents,
  getRelationshipStats,
  LAYER_TRANSITIONS,
};
