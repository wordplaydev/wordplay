import type LocaleText from '@locale/LocaleText';
import { getLocalePath } from '@util/verify-locales/LocaleSchema';
import { retargetSerializedExample } from '@util/verify-locales/retargetExampleNames';
import {
    ExamplesRoot,
    localizedExamplesPath,
} from '@util/verify-locales/verifyExamples';
import fs from 'fs';
import path from 'path';
import { expect, test } from 'vitest';
import { parseSerializedProject } from '../../examples/examples';

/**
 * Drift detection for the localized gallery examples (#1310), the same
 * contract exampleNamesSync.test.ts makes for `\…\` examples in locale files:
 * a localized `.wp` spells names declared in its locale file, so
 * re-translating a name strands it, and a master edited after localization
 * leaves the translation describing a different program. `npm run locales-fix`
 * repairs the first deterministically and `npm run locales-translate <locale>
 * +example` re-buys the second; this is what makes either fail `npm test`
 * rather than wait for someone to run them.
 *
 * Read-only: every check asks what the repair *would* write, writing nothing.
 */

/** Locale directories under static/examples — a locale code shape, so stray
 *  directories (an accidental node_modules) are never read as locales. */
const ExampleLocales = fs
    .readdirSync(ExamplesRoot, { withFileTypes: true })
    .filter(
        (entry) =>
            entry.isDirectory() && /^[a-z]{2,3}(-[A-Z]{2})?$/.test(entry.name),
    )
    .map((entry) => entry.name);

const Timeout = 240_000;

function read<T>(file: string): T | undefined {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
        return undefined;
    }
}

test(
    'localized gallery examples match their master and their locale',
    () => {
        const stale: string[] = [];
        const divergent: string[] = [];
        const orphaned: string[] = [];
        for (const code of ExampleLocales) {
            const locale: LocaleText | undefined = read(getLocalePath(code));
            if (locale === undefined) continue;
            const dir = localizedExamplesPath(code);
            const files = fs
                .readdirSync(dir, { withFileTypes: true })
                .filter((entry) => entry.isFile() && entry.name.endsWith('.wp'))
                .map((entry) => entry.name);
            for (const filename of files) {
                const masterPath = path.join(ExamplesRoot, filename);
                if (!fs.existsSync(masterPath)) {
                    orphaned.push(`${code}/${filename}`);
                    continue;
                }
                const id = filename.replace('.wp', '');
                const master = parseSerializedProject(
                    fs.readFileSync(masterPath, 'utf8'),
                    id,
                );
                const localized = parseSerializedProject(
                    fs.readFileSync(path.join(dir, filename), 'utf8'),
                    id,
                );
                const result = retargetSerializedExample(
                    master.sources,
                    localized.sources,
                    locale,
                    locale.language,
                );
                if (result.kind === 'retargeted')
                    stale.push(`${code}/${filename}`);
                else if (result.kind === 'divergent')
                    divergent.push(`${code}/${filename}`);
            }
        }
        expect(
            stale,
            'These localized examples name something their locale no longer declares. Run "npm run locales-fix" to retarget them.',
        ).toEqual([]);
        expect(
            divergent,
            'These localized examples no longer match their master\'s shape. Run "npm run locales-translate <locale> +example" to re-translate them.',
        ).toEqual([]);
        expect(
            orphaned,
            'These localized examples have no master. Run "npm run locales-fix" to delete them.',
        ).toEqual([]);
    },
    Timeout,
);
