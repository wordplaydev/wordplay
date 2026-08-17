import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { buildTheme, Modes, ThemeFiles } from './theme';

/**
 * Guards the VS Code theme against palette drift: the committed theme files
 * are generated from src/app.html and the editor's token colors, so a palette
 * edit that isn't followed by `npm run vscode-theme` fails here rather than
 * silently leaving the theme showing last month's colors.
 */

describe.each(Modes)('%s theme', (mode) => {
    test('committed file matches the palette', () => {
        const committed: unknown = JSON.parse(
            readFileSync(ThemeFiles[mode].path, 'utf-8'),
        );
        expect(committed).toEqual(buildTheme(mode));
    });
});
