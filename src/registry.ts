/**
 * Registry client for fetching package metadata from npm
 */

export interface PackageVersion {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

export interface PackageMetadata {
  name: string;
  versions: Record<string, PackageVersion>;
  'dist-tags': Record<string, string>;
}

/**
 * Fetches package metadata from npm registry
 */
export async function fetchPackageMetadata(
  packageName: string,
  registry = 'https://registry.npmjs.org'
): Promise<PackageMetadata> {
  const response = await fetch(`${registry}/${packageName}`, {
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${packageName}: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<PackageMetadata>;
}

/**
 * Gets all versions that satisfy a semver range, sorted descending
 */
export async function getMatchingVersions(
  metadata: PackageMetadata,
  versionRange: string
): Promise<string[]> {
  const semver = await import('semver');

  return Object.keys(metadata.versions)
    .filter(version => {
      try {
        return semver.satisfies(version, versionRange);
      } catch {
        return false;
      }
    })
    .sort((a, b) => semver.rcompare(a, b));
}
