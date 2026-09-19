import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { expect, test } from 'vitest';

/**
 * Serializing a value walks everything reachable from it, and that cost belongs
 * behind a click.
 *
 * `canExport` is an O(1) class test that a render path or the editor's menu may
 * call on every frame; `toGrid`, `toJSON` and everything built on them reshape
 * the whole value and may only run once a creator has asked for a file. The
 * split is invisible in the types — both are plain functions over a `Value` —
 * so the only thing keeping it true is this test.
 *
 * Checked per *file* rather than per call, for the reason
 * `proxyExportConvention.test.ts` records about its own first draft: asking
 * "does this file know about the deep serializers at all" cannot be dodged by
 * moving the call into a helper.
 */

/** The modules a component may import to serialize a value. */
const Deep = [
    '@values/export/exportValue',
    '@values/export/grid',
    '@values/export/json',
];

/** Components allowed to reach them, and why. */
const Allowed: Record<string, string> = {
    'src/components/values/ValueExportDialog.svelte':
        'the dialog is where a creator has asked for a file, which is the one moment the walk is affordable',
};

function sources(dir: string, found: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) sources(full, found);
        else if (/\.(ts|svelte)$/.test(entry) && !entry.endsWith('.test.ts'))
            found.push(full);
    }
    return found;
}

test('only the export dialog imports the deep serializers', () => {
    const offenders = sources('src/components')
        .filter((file) => {
            const text = readFileSync(file, 'utf8');
            return Deep.some((module) => text.includes(`'${module}'`));
        })
        .map((file) => file.split(path.sep).join('/'))
        .filter((file) => Allowed[file] === undefined);

    expect(
        offenders,
        'these render in the editor or on stage; import `@values/export/canExport` instead, and serialize behind a dialog',
    ).toEqual([]);
});
