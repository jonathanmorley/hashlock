/**
 * Dependency tree resolver
 */

import { fetchPackageMetadata, getMatchingVersions, type PackageMetadata, type PackageVersion } from './registry.js';

export interface DependencyNode {
  name: string;
  version: string;
  dependencies: Map<string, DependencyNode>;
}

export interface ResolverOptions {
  registry?: string;
  maxDepth?: number;
}

/**
 * Cache for package metadata to avoid redundant fetches
 */
const metadataCache = new Map<string, PackageMetadata>();

/**
 * Creates an empty dependency node
 */
function createEmptyNode(name: string, version: string): DependencyNode {
  return { name, version, dependencies: new Map() };
}

/**
 * Fetches and caches package metadata
 */
async function getCachedMetadata(packageName: string, registry?: string): Promise<PackageMetadata> {
  let metadata = metadataCache.get(packageName);
  if (!metadata) {
    metadata = await fetchPackageMetadata(packageName, registry);
    metadataCache.set(packageName, metadata);
  }
  return metadata;
}

/**
 * Gets all dependencies for a package version
 */
function getDependencies(versionData: PackageVersion): Record<string, string> {
  return versionData.dependencies || {};
}

/**
 * Resolves a single dependency tree with specific version choices
 */
export async function resolveDependencyTree(
  packageName: string,
  version: string,
  options: ResolverOptions = {},
  depth = 0,
  resolving = new Set<string>()
): Promise<DependencyNode> {
  const { registry, maxDepth = 10 } = options;

  // Prevent infinite recursion and circular dependencies
  const resolutionKey = `${packageName}@${version}`;
  if (depth > maxDepth || resolving.has(resolutionKey)) {
    return createEmptyNode(packageName, version);
  }

  resolving.add(resolutionKey);

  try {
    const metadata = await getCachedMetadata(packageName, registry);
    const versionData = metadata.versions[version];

    if (!versionData) {
      throw new Error(`Version ${version} not found for package ${packageName}`);
    }

    const allDeps = getDependencies(versionData);
    const resolvedDeps = new Map<string, DependencyNode>();

    for (const [depName, depRange] of Object.entries(allDeps)) {
      try {
        const depMetadata = await getCachedMetadata(depName, registry);
        const matchingVersions = await getMatchingVersions(depMetadata, depRange);

        if (matchingVersions.length > 0) {
          // Use the highest matching version by default
          const resolvedDep = await resolveDependencyTree(
            depName,
            matchingVersions[0],
            options,
            depth + 1,
            new Set(resolving)
          );
          resolvedDeps.set(depName, resolvedDep);
        }
      } catch (error) {
        console.warn(`Failed to resolve ${depName}@${depRange}: ${error}`);
      }
    }

    return { name: packageName, version, dependencies: resolvedDeps };
  } finally {
    resolving.delete(resolutionKey);
  }
}

/**
 * Generates all possible dependency trees by exploring different version choices
 */
export async function* generateAllPossibleTrees(
  packageName: string,
  version: string,
  options: ResolverOptions = {},
  maxTrees = 1000
): AsyncGenerator<DependencyNode> {
  const { registry, maxDepth = 10 } = options;
  const treeCount = { count: 0 };

  yield* exploreTree(packageName, version, {
    depth: 0,
    resolving: new Set(),
    treeCount,
    registry,
    maxDepth,
    maxTrees
  });
}

interface ExploreContext {
  depth: number;
  resolving: Set<string>;
  treeCount: { count: number };
  registry?: string;
  maxDepth: number;
  maxTrees: number;
}

/**
 * Recursively explores all possible dependency trees
 */
async function* exploreTree(
  pkgName: string,
  pkgVersion: string,
  ctx: ExploreContext
): AsyncGenerator<DependencyNode> {
  const { depth, resolving, treeCount, maxDepth, maxTrees } = ctx;

  // Check limits and circular dependencies
  const resolutionKey = `${pkgName}@${pkgVersion}`;
  if (depth > maxDepth || treeCount.count >= maxTrees || resolving.has(resolutionKey)) {
    yield createEmptyNode(pkgName, pkgVersion);
    return;
  }

  resolving.add(resolutionKey);

  try {
    const metadata = await getCachedMetadata(pkgName, ctx.registry);
    const versionData = metadata.versions[pkgVersion];

    if (!versionData) {
      yield createEmptyNode(pkgName, pkgVersion);
      return;
    }

    const allDeps = getDependencies(versionData);
    const depNames = Object.keys(allDeps);

    if (depNames.length === 0) {
      yield createEmptyNode(pkgName, pkgVersion);
      return;
    }

    // Generate all combinations of dependency versions
    for await (const depsCombination of generateDependencyCombinations(depNames, allDeps, ctx)) {
      if (treeCount.count >= maxTrees) break;

      if (depth === 0) treeCount.count++;

      yield {
        name: pkgName,
        version: pkgVersion,
        dependencies: depsCombination,
      };
    }
  } finally {
    resolving.delete(resolutionKey);
  }
}

/**
 * Generates all combinations of dependencies by exploring different version choices
 */
async function* generateDependencyCombinations(
  depNames: string[],
  allDeps: Record<string, string>,
  ctx: ExploreContext
): AsyncGenerator<Map<string, DependencyNode>> {
  if (depNames.length === 0) {
    yield new Map();
    return;
  }

  const [currentDep, ...remainingDeps] = depNames;
  const depRange = allDeps[currentDep];

  try {
    const depMetadata = await getCachedMetadata(currentDep, ctx.registry);
    const matchingVersions = await getMatchingVersions(depMetadata, depRange);
    const versionsToExplore = matchingVersions.slice(0, 3); // Top 3 versions only

    if (versionsToExplore.length === 0) {
      // Skip this dependency and continue with remaining
      yield* generateDependencyCombinations(remainingDeps, allDeps, ctx);
      return;
    }

    // For each version of the current dependency
    for (const depVersion of versionsToExplore) {
      if (ctx.treeCount.count >= ctx.maxTrees) break;

      // Explore all possible trees for this dependency
      const newCtx = { ...ctx, depth: ctx.depth + 1, resolving: new Set(ctx.resolving) };
      for await (const resolvedDep of exploreTree(currentDep, depVersion, newCtx)) {
        // Combine with all combinations of remaining dependencies
        for await (const remainingCombination of generateDependencyCombinations(remainingDeps, allDeps, ctx)) {
          const combined = new Map(remainingCombination);
          combined.set(currentDep, resolvedDep);
          yield combined;
        }
      }
    }
  } catch (error) {
    // Skip this dependency on error and continue with remaining
    yield* generateDependencyCombinations(remainingDeps, allDeps, ctx);
  }
}
