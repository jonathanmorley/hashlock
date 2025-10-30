/**
 * Tree hashing utilities
 */

import { createHash } from 'node:crypto';
import type { DependencyNode } from './resolver.js';

/**
 * Serializes a dependency tree into a deterministic string representation
 */
export function serializeTree(node: DependencyNode): string {
  const parts: string[] = [];

  function serialize(n: DependencyNode, indent = 0): void {
    const prefix = '  '.repeat(indent);
    parts.push(`${prefix}${n.name}@${n.version}`);

    // Sort dependencies by name for deterministic output
    const sortedDeps = Array.from(n.dependencies.entries()).sort(([a], [b]) => a.localeCompare(b));

    for (const [, dep] of sortedDeps) {
      serialize(dep, indent + 1);
    }
  }

  serialize(node);
  return parts.join('\n');
}

/**
 * Computes a hash of a dependency tree
 */
export function hashTree(node: DependencyNode, algorithm: 'sha256' | 'sha512' = 'sha256'): string {
  const serialized = serializeTree(node);
  const hash = createHash(algorithm);
  hash.update(serialized);
  return hash.digest('hex');
}

/**
 * Converts a dependency tree to a flat structure (lockfile-like)
 */
export function treeToFlatStructure(node: DependencyNode): Record<string, string> {
  const flat: Record<string, string> = {};

  function flatten(n: DependencyNode): void {
    flat[n.name] = n.version;
    for (const dep of n.dependencies.values()) {
      flatten(dep);
    }
  }

  flatten(node);
  return flat;
}
