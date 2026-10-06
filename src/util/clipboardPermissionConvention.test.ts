import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { expect, test } from 'vitest';

/**
 * Clipboard access is granted through `grantClipboard`, never directly.
 *
 * WebKit has no `clipboard-write` permission and `grantPermissions` throws on
 * it rather than ignoring it. PR CI runs Chromium only, so a direct grant
 * passes every PR and fails only the WebKit nightly — which it has done twice.
 */
const ClipboardGrant = /grantPermissions\([^)]*clipboard-/g;

const Directories = ['tests/end2end', 'tests/helpers'];
const Helper = join('tests/helpers', 'clipboard.ts');

test('no end-to-end test grants a clipboard permission directly', () => {
    const offenders = Directories.flatMap((directory) =>
        readdirSync(directory)
            .filter((name) => name.endsWith('.ts'))
            .map((name) => join(directory, name))
            .filter((path) => path !== Helper)
            .flatMap((path) =>
                [...readFileSync(path, 'utf8').matchAll(ClipboardGrant)].map(
                    (match) => `${path}: ${match[0]}`,
                ),
            ),
    );
    expect(
        offenders,
        'use grantClipboard from tests/helpers/clipboard.ts: WebKit throws on clipboard permissions',
    ).toEqual([]);
});
