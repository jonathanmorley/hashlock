/**
 * Hash-Lock: Find dependency trees by hash
 */

import { generateAllPossibleTrees, type DependencyNode, type ResolverOptions } from './resolver.js';
import { hashTree } from './hasher.js';

export { type DependencyNode, type ResolverOptions } from './resolver.js';
export { hashTree, serializeTree, treeToFlatStructure } from './hasher.js';

export interface FindTreeByHashOptions extends ResolverOptions {
  /**
   * Hash algorithm to use (default: 'sha256')
   */
  algorithm?: 'sha256' | 'sha512';

  /**
   * Maximum number of trees to explore (default: 1000)
   */
  maxTrees?: number;
}

export interface FindTreeByHashResult {
  /**
   * The dependency tree that matches the hash
   */
  tree: DependencyNode;

  /**
   * The computed hash of the tree
   */
  hash: string;

  /**
   * Number of trees explored before finding the match
   */
  treesExplored: number;
}

/**
 * Finds a dependency tree that matches the given hash
 *
 * @param packageName - The package name
 * @param version - The package version
 * @param targetHash - The hash to match against
 * @param options - Resolution options
 * @returns The matching tree, or null if not found
 *
 * @example
 * ```ts
 * const result = await findTreeByHash('lodash', '4.17.21', 'abc123...');
 * if (result) {
 *   console.log('Found matching tree:', result.tree);
 * }
 * ```
 */
export async function findTreeByHash(
  packageName: string,
  version: string,
  targetHash: string,
  options: FindTreeByHashOptions = {}
): Promise<FindTreeByHashResult | null> {
  const { algorithm = 'sha256', maxTrees = 1000, ...resolverOptions } = options;

  let treesExplored = 0;

  for await (const tree of generateAllPossibleTrees(packageName, version, resolverOptions, maxTrees)) {
    treesExplored++;

    const hash = hashTree(tree, algorithm);

    if (hash === targetHash) {
      return {
        tree,
        hash,
        treesExplored,
      };
    }
  }

  return null;
}

/**
 * Resolves a single dependency tree and computes its hash
 *
 * @param packageName - The package name
 * @param version - The package version
 * @param options - Resolution options
 * @returns The tree and its hash
 *
 * @example
 * ```ts
 * const result = await resolveAndHash('lodash', '4.17.21');
 * console.log('Hash:', result.hash);
 * console.log('Tree:', result.tree);
 * ```
 */
export async function resolveAndHash(
  packageName: string,
  version: string,
  options: FindTreeByHashOptions = {}
): Promise<{ tree: DependencyNode; hash: string }> {
  const { algorithm = 'sha256', maxTrees = 1, ...resolverOptions } = options;

  // Generate just one tree
  for await (const tree of generateAllPossibleTrees(packageName, version, resolverOptions, 1)) {
    const hash = hashTree(tree, algorithm);
    return { tree, hash };
  }

  throw new Error(`Failed to resolve ${packageName}@${version}`);
}
