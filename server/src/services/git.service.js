import simpleGit from 'simple-git';
import fs from 'fs/promises';

/**
 * Clone a Git repository to a destination directory
 * @param {string} repoUrl - Git repository URL
 * @param {string} destDir - Destination directory
 * @returns {Promise<string>} - Path to cloned project root
 */
export async function cloneRepository(repoUrl, destDir) {
  console.log('🔗 Cloning Git repository...');
  console.log(`   URL: ${repoUrl}`);

  // Ensure destination exists
  await fs.mkdir(destDir, { recursive: true });

  // Configure git with timeout and progress
  const git = simpleGit({
    timeout: {
      block: 60000, // 60 seconds for any single git operation
    },
    progress({ method, stage, progress }) {
      console.log(`   Git ${method} ${stage} ${progress}%`);
    },
  });

  try {
    // Shallow clone with single branch for speed
    await git.clone(repoUrl, destDir, ['--depth', '1', '--single-branch']);
    console.log(`✅ Cloned to: ${destDir}`);
    return destDir;
  } catch (err) {
    console.error('❌ Git clone failed:', err.message);

    // Clean up failed clone directory
    try {
      await fs.rm(destDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    // Provide user-friendly error messages
    if (err.message.includes('not found') || err.message.includes('404')) {
      throw new Error('Repository not found. Please check the URL.');
    }
    if (
      err.message.includes('Authentication') ||
      err.message.includes('auth')
    ) {
      throw new Error(
        'Authentication failed. Make sure the repository is public.',
      );
    }
    if (err.message.includes('timeout')) {
      throw new Error(
        'Clone timed out. The repository might be too large or network is slow.',
      );
    }

    throw new Error(`Failed to clone repository: ${err.message}`);
  }
}

/**
 * Validate Git URL format
 * @param {string} url - URL to validate
 * @returns {boolean}
 */
export function isValidGitUrl(url) {
  if (!url || typeof url !== 'string') return false;

  const trimmedUrl = url.trim();

  // Common Git URL patterns
  const patterns = [
    /^https?:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/i,
    /^https?:\/\/github\.com\/[\w.-]+\/[\w.-]+\.git$/i,
    /^https?:\/\/gitlab\.com\/[\w.-]+\/[\w.-]+\/?$/i,
    /^https?:\/\/bitbucket\.org\/[\w.-]+\/[\w.-]+\/?$/i,
    /^https?:\/\/.+\/.+\.git$/i,
  ];

  return patterns.some((pattern) => pattern.test(trimmedUrl));
}

/**
 * Extract repository name from URL
 * @param {string} url - Git URL
 * @returns {string}
 */
export function getRepoName(url) {
  const cleaned = url
    .trim()
    .replace(/\.git$/, '')
    .replace(/\/$/, '');
  const parts = cleaned.split('/');
  return parts[parts.length - 1] || 'unknown-repo';
}
