import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { expect, test } from 'vitest';
import { peelHeader } from './examples';

/**
 * No `.wp` file Wordplay ships carries a metadata preamble (#152).
 *
 * @sweep static/examples every committed example and kit source, masters and
 * every locale's translations, because the guarantee is about the corpus rather
 * than about any one file.
 *
 * This is the whole of the safety argument for where a preamble sits. A
 * preamble is the one position in the format that corrupts a file *silently*
 * for a reader that does not know about it: `parseSerializedProject` splits on
 * `=== ` lookaheads, so lines before the first header become a phantom source
 * at index 0 — and index 0 is the project's **main** source. Nothing throws;
 * the stage simply renders nothing.
 *
 * Three independent parsers read these files, and only one of them has been
 * taught about preambles:
 *
 * - `parseSerializedProject` (this package) — updated
 * - `parseBuiltinKitSource` (src/db/kits/kitSourceFile.ts) — kits have no name
 *   line, so its rules differ and it would mistake a preamble for its header
 * - `parseWpProjectName` (functions/src/preview/shared.ts) — a Cloud Functions
 *   duplicate, which cannot import from `src/` and so cannot share the fix
 *
 * So a preamble belongs only in a file a creator exported, which none of the
 * other two ever sees. If this test fails, the fix is to take the preamble out
 * of the corpus — never to relax the test.
 */

/** Where Wordplay's own `.wp` files live. */
const Roots = ['static/examples', 'src/db/kits/sources'];

/** `static/examples` also holds build artifacts and stray package directories,
 *  which is why the walk filters by extension rather than trusting the tree. */
function wordplayFiles(dir: string, found: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        if (entry === 'node_modules' || entry.startsWith('.')) continue;
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) wordplayFiles(full, found);
        else if (entry.endsWith('.wp')) found.push(full);
    }
    return found;
}

test('no shipped .wp file carries a preamble', () => {
    const files = Roots.flatMap((root) => wordplayFiles(root));

    // A guard over an empty set is a guard over nothing. The corpus is ~2,300
    // files; a walk that suddenly found a handful would mean the roots moved.
    expect(files.length).toBeGreaterThan(2000);

    const offenders = files.filter((file) => {
        // Through the parser's own peel, so this cannot disagree with it about
        // where a preamble would be.
        const { preamble } = peelHeader(readFileSync(file, 'utf8'));
        return Object.keys(preamble).length > 0;
    });

    expect(
        offenders.map((f) => f.split(path.sep).join('/')),
        'A shipped .wp file has a metadata preamble. Two of the three parsers that read these files would take it as the project’s main source and render nothing, without throwing. Remove the preamble; do not relax this test.',
    ).toEqual([]);
});
