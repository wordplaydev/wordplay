import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { parseSerializedProject } from '../examples/examples';
import { analyzeDelimiters } from '#parser/delimiterRecovery.ts';
import { tokenize } from '#parser/Tokenizer.ts';
import { expect, test } from 'vitest';

/**
 * Every example Wordplay ships has balanced delimiters, as the parser's recovery sees them.
 *
 * @sweep static/examples Every master example and every locale's translation of it is
 * tokenized, because the claim is about what real programs contain, not about any one.
 *
 * Recovery from a missing delimiter consults layout, which means nothing in the grammar,
 * and what makes that safe is that it is consulted only for code whose delimiters don't
 * pair. So this is the proof that it changes how no shipped program is read: if the
 * pre-pass ever disagreed with the tokenizer about what is text, markup or an example,
 * it would find something to recover from in a program with nothing wrong with it.
 */
function wordplayFiles(dir: string, found: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        if (entry === 'node_modules' || entry.startsWith('.')) continue;
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) wordplayFiles(full, found);
        else if (entry.endsWith('.wp')) found.push(full);
    }
    return found;
}

// Tokenizing some 2,300 programs takes a few seconds, more beside the other sweeps.
test('no shipped example needs delimiter recovery', { timeout: 60_000 }, () => {
    const files = wordplayFiles('static/examples');
    expect(files.length).toBeGreaterThan(2000);

    const unbalanced: string[] = [];
    let sources = 0;
    for (const file of files) {
        const project = parseSerializedProject(
            readFileSync(file, 'utf8'),
            file,
        );
        for (const source of project.sources) {
            sources++;
            // Recovering, as a program being edited is read, so that this covers
            // every repair it can make: none may be made to a program with nothing wrong.
            const list = tokenize(source.code, undefined, true);
            const { stray, boundary } = analyzeDelimiters(
                list.getTokens(),
                list.getSpaces(),
                list.getLexical(),
            );
            // Nor may the tokenizer have found text, markup or an example left open,
            // which is what makes it guess at where one ended.
            if (
                list.getLexical().damaged ||
                stray.size > 0 ||
                boundary.size > 0
            )
                unbalanced.push(file.split(path.sep).join('/'));
        }
    }

    // A guard over no sources would be a guard over nothing.
    expect(sources).toBeGreaterThanOrEqual(files.length);
    expect(
        unbalanced,
        'A shipped example has a delimiter the parser would recover from. Either the example is missing one, or delimiterRecovery.ts no longer agrees with the tokenizer about where code is.',
    ).toEqual([]);
});
