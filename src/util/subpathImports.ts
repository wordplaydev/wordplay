import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The subpath import patterns in package.json, as [specifier prefix, path prefix]
 * pairs: `"#db/*": "./src/db/*"` becomes `['#db/', 'src/db/']`. For node-side
 * tools that resolve the app's imports by hand; reading the manifest rather than
 * restating it is what keeps them resolving the way the bundler does.
 */
const cache = new Map<string, [string, string][]>();
export default function getSubpathImports(root: string): [string, string][] {
    const cached = cache.get(root);
    if (cached) return cached;
    const manifest: unknown = JSON.parse(
        readFileSync(resolve(root, 'package.json'), 'utf8'),
    );
    const imports =
        typeof manifest === 'object' &&
        manifest !== null &&
        'imports' in manifest &&
        typeof manifest.imports === 'object' &&
        manifest.imports !== null
            ? Object.entries(manifest.imports)
            : [];
    const pairs: [string, string][] = imports.flatMap(([key, target]) =>
        key.endsWith('*') && typeof target === 'string' && target.endsWith('*')
            ? [[key.slice(0, -1), target.slice(0, -1).replace(/^\.\//, '')]]
            : [],
    );
    cache.set(root, pairs);
    return pairs;
}
