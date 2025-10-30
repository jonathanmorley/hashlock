import { findTreeByHash, serializeTree } from './dist/index.js';
import { generateAllPossibleTrees } from './dist/resolver.js';
import { hashTree } from './dist/hasher.js';

// Example 1: Resolve a package and get its hash
console.log('Example 1: Resolving and hashing a dependency tree...\n');

for await (const tree of generateAllPossibleTrees('axios', '1.8.4')) {
  const hash = hashTree(tree);
  console.log(hash);
  console.log(serializeTree(tree));
}

const foundResult = await findTreeByHash('axios', '1.8.4', '940870162d8834171ce40b95b5fcacd11c747e5ea08eb128fd6b5e60a960c326');

if (foundResult) {
  console.log('Found matching tree!');
  console.log('Trees explored:', foundResult.treesExplored);
  console.log('Hash:', foundResult.hash);
} else {
  console.log('No matching tree found');
}
