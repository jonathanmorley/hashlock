# hash-lock

Find dependency trees by hash. Hash-lock resolves npm package dependency trees, computes cryptographic hashes of those trees, and can search through multiple possible resolution strategies to find a tree matching a target hash.

## Features

- Resolve npm package dependencies into a complete tree structure
- Generate cryptographic hashes (SHA-256 or SHA-512) of dependency trees
- Search through multiple possible dependency resolutions to find trees matching a target hash
- Deterministic tree serialization for consistent hashing
- Support for custom npm registries
- Configurable resolution depth and exploration limits

## Installation

```bash
npm install hash-lock
```

## Usage

### Basic Example

```javascript
import { resolveAndHash, findTreeByHash } from 'hash-lock';

// Resolve a package and get its hash
const result = await resolveAndHash('axios', '1.8.4');
console.log('Hash:', result.hash);
console.log('Tree:', result.tree);
```

### Finding a Tree by Hash

```javascript
import { findTreeByHash } from 'hash-lock';

// Search for a dependency tree that produces a specific hash
const result = await findTreeByHash(
  'axios',
  '1.8.4',
  '940870162d8834171ce40b95b5fcacd11c747e5ea08eb128fd6b5e60a960c326'
);

if (result) {
  console.log('Found matching tree!');
  console.log('Trees explored:', result.treesExplored);
  console.log('Hash:', result.hash);
  console.log('Tree:', result.tree);
} else {
  console.log('No matching tree found');
}
```

### Exploring All Possible Trees

```javascript
import { generateAllPossibleTrees } from 'hash-lock/resolver';
import { hashTree, serializeTree } from 'hash-lock';

// Generate and hash all possible dependency resolutions
for await (const tree of generateAllPossibleTrees('axios', '1.8.4')) {
  const hash = hashTree(tree);
  console.log('Hash:', hash);
  console.log(serializeTree(tree));
}
```

## API

### `resolveAndHash(packageName, version, options?)`

Resolves a single dependency tree and computes its hash.

**Parameters:**
- `packageName` (string): The npm package name
- `version` (string): The package version
- `options` (object, optional):
  - `algorithm` ('sha256' | 'sha512'): Hash algorithm (default: 'sha256')
  - `registry` (string): Custom npm registry URL
  - `maxDepth` (number): Maximum resolution depth (default: 10)

**Returns:** Promise resolving to `{ tree, hash }`

### `findTreeByHash(packageName, version, targetHash, options?)`

Searches for a dependency tree matching the target hash.

**Parameters:**
- `packageName` (string): The npm package name
- `version` (string): The package version
- `targetHash` (string): The hash to match against
- `options` (object, optional):
  - `algorithm` ('sha256' | 'sha512'): Hash algorithm (default: 'sha256')
  - `maxTrees` (number): Maximum trees to explore (default: 1000)
  - `registry` (string): Custom npm registry URL
  - `maxDepth` (number): Maximum resolution depth (default: 10)

**Returns:** Promise resolving to `{ tree, hash, treesExplored }` or `null`

### `hashTree(tree, algorithm?)`

Computes a cryptographic hash of a dependency tree.

**Parameters:**
- `tree` (DependencyNode): The dependency tree
- `algorithm` ('sha256' | 'sha512'): Hash algorithm (default: 'sha256')

**Returns:** String (hex-encoded hash)

### `serializeTree(tree)`

Serializes a dependency tree to a deterministic string representation.

**Parameters:**
- `tree` (DependencyNode): The dependency tree

**Returns:** String (formatted tree structure)

### `treeToFlatStructure(tree)`

Converts a dependency tree to a flat lockfile-like structure.

**Parameters:**
- `tree` (DependencyNode): The dependency tree

**Returns:** Object mapping package names to versions

## How It Works

Hash-lock resolves npm package dependencies by:

1. Fetching package metadata from the npm registry
2. Resolving version ranges to specific versions
3. Building complete dependency trees
4. Exploring multiple possible resolutions (different compatible versions)
5. Computing cryptographic hashes of the serialized tree structures

This allows you to:
- Verify that a dependency tree matches expected structure
- Search for specific dependency configurations
- Understand how version resolution affects the final dependency graph

## Use Cases

- Dependency verification and auditing
- Reproducible builds
- Security analysis of dependency trees
- Understanding npm version resolution behavior
- Finding specific dependency configurations

## License

Apache-2.0

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.
