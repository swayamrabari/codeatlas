import mongoose from 'mongoose';
import Embedding from '../models/Embedding.js';
import {
  answerQuestionWithContext,
  streamAnswerWithContext,
  generateEmbeddings,
} from '../analysis/ai.service.js';

const DEFAULT_TOP_K = 15;
const DEFAULT_NUM_CANDIDATES = 200;
const MAX_CONTEXT_CHARS = 24000;
const MIN_SCORE_THRESHOLD = 0.4;
const BROAD_ONLY_THRESHOLD = 0.55;
const SCORE_GAP_MIN_RESULTS = 5;
const SCORE_GAP_THRESHOLD = 0.06;
const POST_DIVERSITY_GAP_THRESHOLD = 0.02;
const POST_DIVERSITY_SCORE_RATIO = 0.92;

// ── Intent Types ──
const INTENT = {
  FILE_SPECIFIC: 'file_specific', // "What does auth.controller.js do?"
  FEATURE_OVERVIEW: 'feature_overview', // "How does authentication work?"
  ARCHITECTURE: 'architecture', // "What is the project structure?"
  CODE_DETAIL: 'code_detail', // "Show me the login function"
  GENERAL: 'general', // Anything else
};

/**
 * Chunk-type diversity targets per intent — ensure the right mix of context.
 * Each intent emphasizes different chunk types for best results.
 */
const DIVERSITY_BY_INTENT = {
  [INTENT.FILE_SPECIFIC]: {
    'file-docs': 5,
    'file-summary': 4,
    code: 4,
    'feature-summary': 1,
    'feature-docs': 1,
    'project-docs': 0,
  },
  [INTENT.FEATURE_OVERVIEW]: {
    'feature-docs': 4,
    'feature-summary': 3,
    'file-summary': 3,
    'file-docs': 3,
    code: 1,
    'project-docs': 1,
  },
  [INTENT.ARCHITECTURE]: {
    'project-docs': 2,
    'feature-summary': 4,
    'feature-docs': 3,
    'file-summary': 3,
    'file-docs': 2,
    code: 1,
  },
  [INTENT.CODE_DETAIL]: {
    code: 6,
    'file-docs': 4,
    'file-summary': 3,
    'feature-docs': 1,
    'feature-summary': 1,
    'project-docs': 0,
  },
  [INTENT.GENERAL]: {
    'file-summary': 4,
    'file-docs': 4,
    'feature-summary': 2,
    'feature-docs': 2,
    'project-docs': 1,
    code: 4,
  },
};

/**
 * Tier score boost — higher tiers (core files) get a relevance boost.
 */
const TIER_BOOST = {
  1: 0.06, // Core files — strongest boost
  2: 0.03, // Important files — moderate boost
  3: 0.0, // Peripheral files — no boost
};

/**
 * English stopwords to filter out from keyword search.
 */
const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'shall',
  'can',
  'need',
  'must',
  'and',
  'but',
  'or',
  'nor',
  'not',
  'so',
  'yet',
  'both',
  'either',
  'neither',
  'each',
  'every',
  'all',
  'any',
  'few',
  'more',
  'most',
  'other',
  'some',
  'such',
  'no',
  'only',
  'same',
  'than',
  'too',
  'very',
  'of',
  'in',
  'to',
  'for',
  'with',
  'on',
  'at',
  'from',
  'by',
  'about',
  'as',
  'into',
  'through',
  'during',
  'before',
  'after',
  'above',
  'below',
  'between',
  'out',
  'off',
  'over',
  'under',
  'again',
  'further',
  'then',
  'once',
  'here',
  'there',
  'when',
  'where',
  'why',
  'how',
  'what',
  'which',
  'who',
  'whom',
  'this',
  'that',
  'these',
  'those',
  'its',
  'his',
  'her',
  'our',
  'their',
  'your',
  'my',
  'it',
  'he',
  'she',
  'we',
  'they',
  'you',
  'me',
  'him',
  'them',
  'us',
  'just',
  'also',
  'like',
  'get',
  'got',
  'make',
  'made',
  'give',
  'use',
  'tell',
  'file',
  'files',
  'role',
  'purpose',
  'does',
  'work',
  'explain',
  'describe',
  'show',
  'list',
]);

// ── Intent Detection ──

/**
 * Classify the user's question into an intent type.
 * Determines which retrieval strategy and diversity profile to use.
 */
function classifyIntent(question) {
  const q = question.toLowerCase();

  // File-specific: mentions a file name or component name with extension
  const hasFileName =
    /\b[\w.-]+\.(js|ts|jsx|tsx|vue|py|rb|go|java|css|html|json|yml|yaml|md)\b/i.test(
      q,
    );
  const hasComponent =
    /\b[a-zA-Z]+(Controller|Service|Middleware|Model|Route|Router|Guard|Module|Schema|Config|Helper|Util|Hook|Provider|Context|Store|Reducer|Component)\b/i.test(
      question,
    );

  if (hasFileName || hasComponent) {
    // If asking about code/implementation specifically
    if (
      /\b(code|function|implement|logic|method|class|variable|import|export|return|parameter|argument|handler|callback)\b/i.test(
        q,
      )
    ) {
      return INTENT.CODE_DETAIL;
    }
    return INTENT.FILE_SPECIFIC;
  }

  // Architecture: project-level questions
  if (
    /\b(architect|structure|overview|stack|tech|framework|project|system|design|layer|pattern|organize|folder|directory)\b/i.test(
      q,
    )
  ) {
    return INTENT.ARCHITECTURE;
  }

  // Feature overview: feature/flow/workflow questions
  if (
    /\b(feature|flow|workflow|pipeline|process|lifecycle|end.to.end|how does|how do|how is)\b/i.test(
      q,
    )
  ) {
    return INTENT.FEATURE_OVERVIEW;
  }

  // Code detail: specific implementation questions
  if (
    /\b(code|function|implement|logic|method|class|variable|import|export|return|parameter|snippet|line|syntax)\b/i.test(
      q,
    )
  ) {
    return INTENT.CODE_DETAIL;
  }

  return INTENT.GENERAL;
}

/**
 * Get the chunk-type filter for the focused vector search pass.
 * Returns null if no filtering should be applied (broad search only).
 */
function getFocusedChunkTypes(intent) {
  switch (intent) {
    case INTENT.FILE_SPECIFIC:
      return ['file-summary', 'file-docs', 'code'];
    case INTENT.FEATURE_OVERVIEW:
      return ['feature-summary', 'feature-docs', 'file-summary'];
    case INTENT.ARCHITECTURE:
      return ['project-docs', 'feature-summary', 'feature-docs'];
    case INTENT.CODE_DETAIL:
      return ['code', 'file-docs'];
    default:
      return null; // No focus filtering for general questions
  }
}

// ── Main Entry Point ──

/**
 * Retrieve relevant chunks for a question and generate a grounded answer.
 * @param {Object} args
 * @param {string} args.projectId
 * @param {string} args.question
 * @param {Array<{role: string, content: string}>} [args.history]
 * @param {number} [args.topK]
 * @returns {Promise<{answer: string, citations: Object[], usage: Object}>}
 */
export async function askQuestionForProject({
  projectId,
  question,
  history = [],
  topK = DEFAULT_TOP_K,
}) {
  const retrievedChunks = await retrieveRelevantChunks({
    projectId,
    question,
    topK,
  });

  const { contextText, usedChunks } = buildContextFromChunks(retrievedChunks);
  const sourcePaths = [
    ...new Set(
      usedChunks
        .map((chunk) => chunk.metadata?.path)
        .filter((path) => typeof path === 'string' && path.trim()),
    ),
  ];
  const answer = await answerQuestionWithContext({
    question,
    history,
    contextText,
    sourcePaths,
  });

  const citations = usedChunks.map((chunk) => ({
    path: chunk.metadata?.path || null,
    lineStart: chunk.metadata?.lineStart || null,
    lineEnd: chunk.metadata?.lineEnd || null,
    chunkType: chunk.chunkType,
    score: typeof chunk.score === 'number' ? Number(chunk.score.toFixed(4)) : 0,
    featureName: chunk.metadata?.featureName || null,
  }));

  return {
    answer,
    citations,
    usage: {
      retrievedCount: retrievedChunks.length,
      citedCount: citations.length,
      topK,
    },
  };
}

/**
 * Retrieve relevant chunks and return a streaming LLM response.
 * The retrieval phase is identical to askQuestionForProject; only the
 * answer-generation step is swapped for a streaming variant.
 *
 * @param {Object} args
 * @param {string} args.projectId
 * @param {string} args.question
 * @param {Array<{role: string, content: string}>} [args.history]
 * @param {number} [args.topK]
 * @returns {Promise<{stream: AsyncIterable, citations: Object[], usage: Object}>}
 */
export async function streamAnswerForProject({
  projectId,
  question,
  history = [],
  topK = DEFAULT_TOP_K,
}) {
  const retrievedChunks = await retrieveRelevantChunks({
    projectId,
    question,
    topK,
  });

  const { contextText, usedChunks } = buildContextFromChunks(retrievedChunks);
  const sourcePaths = [
    ...new Set(
      usedChunks
        .map((chunk) => chunk.metadata?.path)
        .filter((path) => typeof path === 'string' && path.trim()),
    ),
  ];

  const stream = await streamAnswerWithContext({
    question,
    history,
    contextText,
    sourcePaths,
  });

  const citations = usedChunks.map((chunk) => ({
    path: chunk.metadata?.path || null,
    lineStart: chunk.metadata?.lineStart || null,
    lineEnd: chunk.metadata?.lineEnd || null,
    chunkType: chunk.chunkType,
    score: typeof chunk.score === 'number' ? Number(chunk.score.toFixed(4)) : 0,
    featureName: chunk.metadata?.featureName || null,
  }));

  return {
    stream,
    citations,
    usage: {
      retrievedCount: retrievedChunks.length,
      citedCount: citations.length,
      topK,
    },
  };
}

// ── Query Expansion ──

/**
 * Expand a raw user question into a richer embedding query.
 * Detects file names, component references, and injects structural hints
 * so vector search matches the metadata-prefixed chunk embeddings.
 */
function expandQuery(question) {
  const parts = [question];

  // Extract potential file names (e.g., "authController.js", "auth.middleware.js")
  const fileNameMatch = question.match(
    /\b([\w.-]+\.(js|ts|jsx|tsx|vue|py|rb|go|java|css|html|json|yml|yaml|md))\b/gi,
  );
  if (fileNameMatch) {
    parts.push(`FILE: ${fileNameMatch.join(', ')}`);
  }

  // Extract component/module-style references (e.g., "AuthController", "UserService")
  const componentMatch = question.match(
    /\b([A-Z][a-zA-Z]+(Controller|Service|Middleware|Model|Component|Hook|Provider|Context|Router|Route|Guard|Module|Store|Reducer|Action|Util|Helper|Config))\b/g,
  );
  if (componentMatch) {
    parts.push(`ROLE: ${componentMatch.join(', ')}`);
  }

  // Detect architecture-level keywords
  const archKeywords = [
    'middleware',
    'controller',
    'service',
    'model',
    'route',
    'authentication',
    'authorization',
    'database',
    'api',
    'endpoint',
    'schema',
    'migration',
    'component',
    'hook',
    'context',
    'state',
    'redux',
    'store',
  ];
  const foundKeywords = archKeywords.filter((kw) =>
    question.toLowerCase().includes(kw),
  );
  if (foundKeywords.length > 0) {
    parts.push(`CATEGORY: ${foundKeywords.join(', ')}`);
  }

  return parts.join('\n');
}

// ── Direct Matching (Non-Vector) ──

/**
 * Extract file name references from the user question.
 * Returns an array of potential file name patterns to search for in metadata.path.
 */
function extractFileReferences(question) {
  const refs = [];

  // Match explicit file names with extensions (e.g., "authController.js")
  const fileNameMatch = question.match(
    /\b([\w.-]+\.(js|ts|jsx|tsx|vue|py|rb|go|java|css|html|json|yml|yaml|md))\b/gi,
  );
  if (fileNameMatch) {
    refs.push(...fileNameMatch);
  }

  // Match camelCase/PascalCase component names without extension
  // (e.g., "authController", "UserService", "auth middleware")
  const camelMatch = question.match(
    /\b([a-zA-Z]+(Controller|Service|Middleware|Model|Route|Router|Guard|Module|Schema|Config|Helper|Util|Hook|Provider|Context|Store|Reducer|Component))\b/gi,
  );
  if (camelMatch) {
    refs.push(...camelMatch);
  }

  return [...new Set(refs)];
}

/**
 * Find chunks by direct metadata.path matching.
 * This is the most reliable way to find chunks about a specific file —
 * no vector search or keyword matching needed.
 */
async function findChunksByFilePath(projectId, fileRefs) {
  if (fileRefs.length === 0) return [];

  // Build regex patterns to match paths containing the file references
  const pathPatterns = fileRefs.map((ref) => {
    // Escape dots for regex, match anywhere in the path
    const escaped = ref.replace(/\./g, '\\.');
    return new RegExp(escaped, 'i');
  });

  // Query for chunks where metadata.path matches any of our patterns
  const pathQuery = {
    projectId: new mongoose.Types.ObjectId(projectId),
    $or: pathPatterns.map((pattern) => ({
      'metadata.path': pattern,
    })),
  };

  const directMatches = await Embedding.find(pathQuery, {
    chunkType: 1,
    content: 1,
    metadata: 1,
  })
    .limit(20)
    .lean();

  // Score direct matches highly — they're exactly what the user asked about
  return directMatches.map((doc) => ({ ...doc, score: 1.0 }));
}

/**
 * Find chunks by matching feature name references in the question.
 */
async function findChunksByFeature(projectId, question) {
  // Extract potential feature-related terms from the question
  const featureTerms = question
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9]/g, ''))
    .filter((t) => t.length >= 4 && !STOPWORDS.has(t));

  if (featureTerms.length === 0) return [];

  // Look for feature chunks where the feature name matches
  const featureRegex = new RegExp(featureTerms.join('|'), 'i');

  const featureMatches = await Embedding.find(
    {
      projectId: new mongoose.Types.ObjectId(projectId),
      chunkType: { $in: ['feature-summary', 'feature-docs'] },
      'metadata.featureName': featureRegex,
    },
    {
      chunkType: 1,
      content: 1,
      metadata: 1,
    },
  )
    .limit(6)
    .lean();

  return featureMatches.map((doc) => ({ ...doc, score: 0.9 }));
}

// ── Atlas Vector Search ──

/**
 * Run a single Atlas $vectorSearch aggregation.
 * @param {Object} args
 * @param {number[]} args.queryVector - Embedding vector for the query.
 * @param {string} args.projectId - Project to scope results to.
 * @param {number} args.limit - Max results to return.
 * @param {string[]|null} args.chunkTypes - Optional chunk-type filter.
 * @returns {Promise<Object[]>} Scored chunks from Atlas.
 */
async function atlasVectorSearch({
  queryVector,
  projectId,
  limit,
  chunkTypes = null,
}) {
  const filter = {
    projectId: new mongoose.Types.ObjectId(projectId),
  };
  if (chunkTypes && chunkTypes.length > 0) {
    filter.chunkType = { $in: chunkTypes };
  }

  return Embedding.aggregate([
    {
      $vectorSearch: {
        index: 'vector_index',
        path: 'embedding',
        queryVector,
        numCandidates: DEFAULT_NUM_CANDIDATES,
        limit,
        filter,
      },
    },
    {
      $project: {
        _id: 1,
        chunkType: 1,
        content: 1,
        metadata: 1,
        score: { $meta: 'vectorSearchScore' },
      },
    },
  ]);
}

/**
 * Extract meaningful keywords from the question for relevance checking.
 * Filters stopwords and short tokens, returns lowercase terms.
 */
function extractQuestionKeywords(question) {
  return question
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9]/g, ''))
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

/**
 * Compute a relevance penalty for chunks whose metadata doesn't overlap
 * with the question's core keywords. Pushes down tangential results.
 * @returns {number} Negative penalty (or 0 for no penalty).
 */
function computeRelevancePenalty(chunk, questionKeywords) {
  if (questionKeywords.length === 0) return 0;

  // Feature & project-level chunks are always broadly relevant — no penalty
  if (
    ['feature-summary', 'feature-docs', 'project-docs'].includes(
      chunk.chunkType,
    )
  ) {
    return 0;
  }

  const meta = chunk.metadata || {};
  const searchableText = [
    meta.path || '',
    meta.role || '',
    meta.category || '',
    ...(meta.searchTags || []),
    ...(meta.exports || []),
  ]
    .join(' ')
    .toLowerCase();

  // Expand auth-intent queries with common auth synonyms and exempt
  // clearly auth-related chunks from penalty.
  const authSynonyms = [
    'auth',
    'login',
    'signin',
    'signon',
    'password',
    'token',
    'jwt',
    'oauth',
    'bearer',
    'session',
    'credential',
    'credentials',
    'refresh',
    'access',
    'authorize',
    'authorization',
    'authenticate',
    'authentication',
  ];

  const hasAuthInQuestion = questionKeywords.some((kw) =>
    authSynonyms.includes(kw),
  );
  if (hasAuthInQuestion) {
    const isAuthChunk = authSynonyms.some((kw) => searchableText.includes(kw));
    if (isAuthChunk) return 0;
  }

  const effectiveKeywords = hasAuthInQuestion
    ? [...new Set([...questionKeywords, ...authSynonyms])]
    : questionKeywords;

  // Count how many question keywords appear in the chunk's metadata
  const matchCount = effectiveKeywords.filter((kw) =>
    searchableText.includes(kw),
  ).length;
  const matchRatio = matchCount / effectiveKeywords.length;

  if (matchRatio >= 0.3) return 0; // Good overlap — no penalty
  if (matchRatio > 0) return -0.03; // Partial overlap — light penalty
  return -0.05; // No overlap — stronger penalty
}

/**
 * Find the optimal cutoff index using score gap detection.
 * Looks for the largest significant gap between consecutive scores
 * after the first few results. Returns the index to cut at (exclusive).
 */
function findScoreGapCutoff(
  chunks,
  maxResults,
  gapThreshold = SCORE_GAP_THRESHOLD,
) {
  if (chunks.length <= SCORE_GAP_MIN_RESULTS) return chunks.length;

  const limit = Math.min(chunks.length, maxResults);
  let largestGap = 0;
  let cutoffIdx = limit;

  for (let i = SCORE_GAP_MIN_RESULTS; i < limit; i++) {
    const gap = chunks[i - 1].score - chunks[i].score;
    if (gap > largestGap && gap >= gapThreshold) {
      largestGap = gap;
      cutoffIdx = i;
    }
  }

  return cutoffIdx;
}

/**
 * Retrieve relevant chunks using intent-aware two-pass Atlas $vectorSearch.
 *
 * Strategy:
 *   Pass 1 (focused) — search only the chunk types most relevant to the
 *     detected intent (e.g., code+file-docs for code questions).
 *   Pass 2 (broad)   — search ALL chunk types to catch cross-cutting context.
 *   Merge, boost by tier, penalize irrelevant, threshold, gap-detect, diversify.
 */
export async function retrieveRelevantChunks({
  projectId,
  question,
  topK = DEFAULT_TOP_K,
}) {
  const retrievalStart = Date.now();
  const intent = classifyIntent(question);
  const questionKeywords = extractQuestionKeywords(question);
  console.log(
    `[Ask] Intent: ${intent} | Keywords: ${questionKeywords.slice(0, 8).join(', ')}`,
  );

  // Step 1: Direct path + feature matching + embedding generation (all parallel)
  // These are fully independent — run them simultaneously instead of sequentially
  const fileRefs = extractFileReferences(question);
  const expandedQuery = expandQuery(question);

  const [directPathChunks, featureChunks, queryVectors] = await Promise.all([
    findChunksByFilePath(projectId, fileRefs),
    findChunksByFeature(projectId, question),
    generateEmbeddings([expandedQuery]),
  ]);

  const queryVector = queryVectors[0];

  console.log(
    `[Ask] Direct matches: ${directPathChunks.length} path, ${featureChunks.length} feature | Embedding ready (${Date.now() - retrievalStart}ms)`,
  );

  // Step 2: Two-pass Atlas Vector Search (depends on queryVector from step 1)
  let searchChunks = [];
  const focusedTypes = getFocusedChunkTypes(intent);

  try {
    // Run focused + broad searches in parallel
    const searchPromises = [
      // Broad search — all chunk types
      atlasVectorSearch({
        queryVector,
        projectId,
        limit: topK * 2,
        chunkTypes: null,
      }),
    ];

    if (focusedTypes) {
      // Focused search — intent-specific chunk types
      searchPromises.push(
        atlasVectorSearch({
          queryVector,
          projectId,
          limit: topK,
          chunkTypes: focusedTypes,
        }),
      );
    }

    const [broadResults, focusedResults] = await Promise.all(searchPromises);

    console.log(
      `[Ask] Atlas vector search: ${broadResults.length} broad` +
        (focusedResults
          ? `, ${focusedResults.length} focused (${focusedTypes.join(', ')})`
          : '') +
        ` (${Date.now() - retrievalStart}ms total)`,
    );

    // Merge: focused results first (higher priority), then broad-only
    const focusedIds = new Set();
    const seenIds = new Set();
    const merged = [];

    if (focusedResults) {
      for (const chunk of focusedResults) {
        const id = chunk._id.toString();
        if (!seenIds.has(id)) {
          seenIds.add(id);
          focusedIds.add(id);
          merged.push({
            ...chunk,
            _fromFocused: true,
            score: chunk.score + 0.02,
          });
        }
      }
    }

    for (const chunk of broadResults) {
      const id = chunk._id.toString();
      if (!seenIds.has(id)) {
        seenIds.add(id);
        merged.push({ ...chunk, _fromFocused: false });
      }
    }

    // Apply tier boost + relevance penalty
    searchChunks = merged.map((chunk) => {
      const tierBoost = TIER_BOOST[chunk.metadata?.tier] || 0;
      const relevancePenalty = computeRelevancePenalty(chunk, questionKeywords);
      return {
        ...chunk,
        score: chunk.score + tierBoost + relevancePenalty,
      };
    });

    // Apply tiered thresholds — broad-only results must score higher to survive
    const beforeFilter = searchChunks.length;
    searchChunks = searchChunks.filter((c) => {
      const threshold = c._fromFocused
        ? MIN_SCORE_THRESHOLD
        : BROAD_ONLY_THRESHOLD;
      return c.score >= threshold;
    });

    if (beforeFilter > searchChunks.length) {
      console.log(
        `[Ask] Filtered ${beforeFilter - searchChunks.length} chunks (focused threshold: ${MIN_SCORE_THRESHOLD}, broad-only: ${BROAD_ONLY_THRESHOLD})`,
      );
    }

    // Re-sort by final score
    searchChunks.sort((a, b) => b.score - a.score);

    // Score gap detection — cut at the largest natural gap after top results
    const gapCutoff = findScoreGapCutoff(searchChunks, topK * 2);
    if (gapCutoff < searchChunks.length) {
      console.log(
        `[Ask] Score gap detected at position ${gapCutoff} (${searchChunks[gapCutoff - 1]?.score.toFixed(4)} → ${searchChunks[gapCutoff]?.score.toFixed(4)}), trimming ${searchChunks.length - gapCutoff} chunks`,
      );
      searchChunks = searchChunks.slice(0, gapCutoff);
    }

    if (searchChunks.length > 0) {
      console.log(
        `[Ask] Top scores (final): ${searchChunks
          .slice(0, 5)
          .map((s) => s.score.toFixed(4))
          .join(', ')}`,
      );
    }
  } catch (err) {
    console.warn(
      `[Ask] Vector search failed, using keyword fallback: ${err.message}`,
    );

    // Keyword fallback with stopword filtering
    const regex = buildKeywordRegex(question);
    const fallback = await Embedding.find(
      {
        projectId,
        content: regex,
      },
      {
        chunkType: 1,
        content: 1,
        metadata: 1,
      },
    )
      .sort({ updatedAt: -1 })
      .limit(topK * 2)
      .lean();

    searchChunks = fallback.map((doc) => ({ ...doc, score: 0 }));
  }

  // Step 3: Merge all sources — direct > feature > vector search (deduplicated)
  const mergedChunks = mergeChunks(
    directPathChunks,
    featureChunks,
    searchChunks,
  );

  // Step 4: Apply intent-aware diversity reranking
  const diversitySlots =
    DIVERSITY_BY_INTENT[intent] || DIVERSITY_BY_INTENT[INTENT.GENERAL];
  const diversified = diversifyChunks(mergedChunks, topK, diversitySlots);

  // Final relevance trim — drop filler chunks past the natural relevance dropoff
  diversified.sort((a, b) => (b.score || 0) - (a.score || 0));

  // Strategy 1: Score-gap detection (catches sharp drops)
  const gapCutoff = findScoreGapCutoff(
    diversified,
    topK,
    POST_DIVERSITY_GAP_THRESHOLD,
  );

  // Strategy 2: Score-ratio cutoff (catches gradual decline away from top score)
  const topScore = diversified[0]?.score || 0;
  const minAcceptable = topScore * POST_DIVERSITY_SCORE_RATIO;
  let ratioCutoff = diversified.length;
  for (let i = SCORE_GAP_MIN_RESULTS; i < diversified.length; i++) {
    if (diversified[i].score < minAcceptable) {
      ratioCutoff = i;
      break;
    }
  }

  // Take the tighter of the two cutoffs
  const finalCutoff = Math.min(gapCutoff, ratioCutoff);
  if (finalCutoff < diversified.length) {
    console.log(
      `[Ask] Post-diversity trim: ${finalCutoff}/${diversified.length} kept ` +
        `(gap@${gapCutoff}, ratio@${ratioCutoff}, minScore=${minAcceptable.toFixed(4)})`,
    );
  }
  return diversified.slice(0, finalCutoff);
}

// ── Merging & Diversity ──

/**
 * Merge direct path matches, feature matches, and search results.
 * Direct path matches come first (highest priority), then feature matches,
 * then search results. Deduplicates by content to avoid repeats.
 */
function mergeChunks(directPathChunks, featureChunks, searchChunks) {
  const merged = [];
  const seenContent = new Set();

  // Helper to add a chunk if not already seen
  const addChunk = (chunk) => {
    const key = (chunk.content || '').slice(0, 200);
    if (!seenContent.has(key)) {
      seenContent.add(key);
      merged.push(chunk);
    }
  };

  // Priority 1: Direct path matches
  for (const chunk of directPathChunks) {
    addChunk(chunk);
  }

  // Priority 2: Feature matches
  for (const chunk of featureChunks) {
    addChunk(chunk);
  }

  // Priority 3: Search results (vector or keyword)
  for (const chunk of searchChunks) {
    addChunk(chunk);
  }

  return merged;
}

/**
 * Reorder chunks to ensure a diverse mix of chunk types.
 * Uses intent-specific diversity slots to pick the right chunk-type mix,
 * then fills remaining slots with the highest-scoring leftover chunks.
 */
function diversifyChunks(chunks, topK, diversitySlots) {
  if (chunks.length <= topK) return chunks;

  const selected = [];
  const used = new Set();

  // Pass 1: fill diversity slots per chunk type
  for (const [type, maxSlots] of Object.entries(diversitySlots)) {
    if (maxSlots === 0) continue;
    const typeChunks = chunks.filter(
      (c, i) => c.chunkType === type && !used.has(i),
    );
    const toTake = Math.min(maxSlots, typeChunks.length);
    for (let j = 0; j < toTake && selected.length < topK; j++) {
      const idx = chunks.indexOf(typeChunks[j]);
      selected.push(typeChunks[j]);
      used.add(idx);
    }
  }

  // Pass 2: fill remaining slots with highest-scoring unused chunks
  const remaining = chunks
    .map((c, i) => ({ chunk: c, idx: i }))
    .filter(({ idx }) => !used.has(idx))
    .sort((a, b) => (b.chunk.score || 0) - (a.chunk.score || 0));

  for (const { chunk, idx } of remaining) {
    if (selected.length >= topK) break;
    selected.push(chunk);
    used.add(idx);
  }

  return selected;
}

// ── Keyword Fallback ──

/**
 * Build keyword regex with stopword filtering.
 * Only matches on meaningful terms from the question.
 */
function buildKeywordRegex(question) {
  const terms = question
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9_\-/.]/g, ''))
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t))
    .slice(0, 12);

  if (terms.length === 0) {
    // If all terms were stopwords, try extracting file-like patterns
    const fileMatch = question.match(/[\w.-]+\.\w+/gi);
    if (fileMatch) {
      return new RegExp(
        fileMatch.map((f) => f.replace(/\./g, '\\.')).join('|'),
        'i',
      );
    }
    return /.*/i;
  }

  return new RegExp(terms.join('|'), 'i');
}

// ── Context Building ──

/**
 * Build the context string from retrieved chunks with rich metadata headers.
 * Each chunk includes its file path, role, category, and chunk type so the
 * LLM can cross-reference and cite specific sources.
 */
function buildContextFromChunks(chunks) {
  const usedChunks = [];
  const parts = [];
  let charCount = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const meta = chunk.metadata || {};

    // Build a rich header with all available metadata
    const headerParts = [`Source ${i + 1}`];

    if (meta.path) {
      headerParts.push(`File: ${meta.path}`);
    }
    if (meta.role) {
      headerParts.push(`Role: ${meta.role}`);
    }
    if (meta.category) {
      headerParts.push(`Category: ${meta.category}`);
    }
    if (meta.featureName) {
      headerParts.push(`Feature: ${meta.featureName}`);
    }
    if (meta.lineStart && meta.lineEnd) {
      headerParts.push(`Lines: ${meta.lineStart}-${meta.lineEnd}`);
    }
    if (meta.tier) {
      headerParts.push(`Tier: ${meta.tier}`);
    }
    headerParts.push(`Type: ${chunk.chunkType}`);
    if (typeof chunk.score === 'number') {
      headerParts.push(`Relevance: ${chunk.score.toFixed(3)}`);
    }

    const header = headerParts.join(' | ');
    const body = (chunk.content || '').trim();
    const section = `[${header}]\n${body}`;

    if (!body) continue;
    if (charCount + section.length > MAX_CONTEXT_CHARS) break;

    parts.push(section);
    usedChunks.push(chunk);
    charCount += section.length;
  }

  return {
    contextText: parts.join('\n\n---\n\n'),
    usedChunks,
  };
}
