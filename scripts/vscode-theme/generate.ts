/**
 * Regenerates the committed VS Code theme files from the app palette, and the
 * committed `.wp` grammar and language configuration from the app's tokenizer.
 * Run with `npm run vscode-theme`; vscodeThemeSync.test.ts and
 * vscodeGrammarSync.test.ts fail if the committed files are stale.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import {
    GrammarFile,
    LanguageConfigurationFile,
    serializeGrammar,
    serializeLanguageConfiguration,
    SyntaxesDirectory,
} from './grammar';
import { Modes, serializeTheme, ThemeDirectory, ThemeFiles } from './theme';

function write(path: string, contents: string) {
    writeFileSync(path, contents, 'utf-8');
    console.log(`Wrote ${relative(process.cwd(), path)}`);
}

mkdirSync(ThemeDirectory, { recursive: true });
mkdirSync(SyntaxesDirectory, { recursive: true });

for (const mode of Modes) write(ThemeFiles[mode].path, serializeTheme(mode));

write(GrammarFile, serializeGrammar());
write(LanguageConfigurationFile, serializeLanguageConfiguration());
