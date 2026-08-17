/**
 * Regenerates the committed VS Code theme files from the app palette.
 * Run with `npm run vscode-theme`; vscodeThemeSync.test.ts fails if the
 * committed files are stale.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import { Modes, serializeTheme, ThemeDirectory, ThemeFiles } from './theme';

mkdirSync(ThemeDirectory, { recursive: true });

for (const mode of Modes) {
    const { path } = ThemeFiles[mode];
    writeFileSync(path, serializeTheme(mode), 'utf-8');
    console.log(`Wrote ${relative(process.cwd(), path)}`);
}
