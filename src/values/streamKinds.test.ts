import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, resolve } from 'path';
import { expect, test } from 'vitest';

/**
 * Guard for the "every stream names its kind" convention.
 *
 * A `StreamKind` is what lets anything outside the runtime say *which* stream
 * reacted without reading locale data — audible re-evaluation cues are keyed by
 * it. The abstract member on `StreamValue` makes declaring one mandatory; this
 * checks the other half, that no two streams claim the same kind, which the
 * type system can't see.
 *
 * A source scan rather than imports, so the test doesn't pull the camera and
 * landmark runtimes into vitest.
 */
const CONCRETE = /^export default class (\w+) extends \w*Stream\w*[<\s{]/m;
const KIND = /readonly kind: StreamKind = '(\w+)';/;

function filesUnder(directory: string): string[] {
    const found: string[] = [];
    for (const entry of readdirSync(directory)) {
        const path = join(directory, entry);
        if (statSync(path).isDirectory()) found.push(...filesUnder(path));
        else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts'))
            found.push(path);
    }
    return found;
}

function streams(): { path: string; name: string; kind: string | undefined }[] {
    const root = resolve(__dirname, '..');
    return [
        ...filesUnder(resolve(root, 'input')),
        ...filesUnder(resolve(root, 'values')),
    ]
        .map((path) => ({ path, text: readFileSync(path, 'utf-8') }))
        .map(({ path, text }) => ({
            path: relative(root, path),
            declaration: CONCRETE.exec(text),
            kind: KIND.exec(text)?.[1],
        }))
        .filter(({ declaration }) => declaration !== null)
        .map(({ path, declaration, kind }) => ({
            path,
            name: declaration?.[1] ?? '',
            kind,
        }));
}

test('every concrete stream declares a kind', () => {
    const found = streams();
    // A canary: if the scan stops finding streams, the assertions below pass
    // vacuously and the convention goes unguarded.
    expect(found.length).toBeGreaterThan(20);
    expect(
        found.filter(({ kind }) => kind === undefined).map(({ path }) => path),
    ).toEqual([]);
});

test('no two streams claim the same kind', () => {
    const kinds = streams().map(({ kind }) => kind);
    const duplicates = kinds.filter(
        (kind, index) => kinds.indexOf(kind) !== index,
    );
    expect(duplicates).toEqual([]);
});
