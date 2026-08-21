import { howToToString, parseHowTo } from '@concepts/HowTo';
import type LanguageCode from '@locale/LanguageCode';
import type LocaleText from '@locale/LocaleText';
import { isMachineTranslated } from '@locale/LocaleText';
import type Translator from '@util/verify-locales/Translator';
import type { RegionCode } from '@locale/Regions';
import Example from '@nodes/Example';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';
import parseDoc from '@parser/parseDoc';
import { DOCS_SYMBOL } from '@parser/Symbols';
import { toTokens } from '@parser/toTokens';
import fs from 'fs';
import path from 'path';
import type Log from '@util/verify-locales/Log';
import getTranslator from '@util/verify-locales/getTranslator';
import writeFormatted from '@util/verify-locales/writeFormatted';

/**
 * Verify and optionally translate how-to content for a locale
 */
export async function verifyHowTo(
    log: Log,
    locale: string,
    language: LanguageCode,
    regions: RegionCode[],
    translateContent: boolean,
    override: boolean,
    /** Optional how-to ids (filename without `.txt`) to narrow the translation
     *  pass to (e.g. `+howto:animate-phrase`). Empty or undefined = all. */
    howtoIds?: string[],
    /** The run's shared translation backend, so its caches (localized examples)
     *  and usage accounting span all 36 files and the rest of the locale run —
     *  a fresh instance per file re-localized shared examples 36 times over.
     *  Undefined = the env-selected backend, constructed once here. */
    translator?: Translator,
    /** The locale's text, passed to the backend as the translation target so
     *  how-tos share the locale run's system prompt (one cache entry) and the
     *  locale's own `guidance` conventions apply here too. */
    localeText?: LocaleText,
): Promise<void> {
    // Skip English locale - it's the source
    if (locale === 'en-US') return;

    const englishHowToDir = path.join('static', 'locales', 'en-US', 'how');
    const targetHowToDir = path.join('static', 'locales', locale, 'how');

    // Check if English how-to directory exists
    if (!fs.existsSync(englishHowToDir)) {
        return;
    }

    let englishFiles: string[];
    try {
        englishFiles = fs
            .readdirSync(englishHowToDir)
            .filter((f) => f.endsWith('.txt'));
    } catch (error) {
        log.bad(`Failed to read English how-to directory: ${error}`);
        return;
    }

    // Narrow to the requested how-to ids, if any (+howto:<id>).
    if (howtoIds !== undefined && howtoIds.length > 0)
        englishFiles = englishFiles.filter((f) =>
            howtoIds.includes(f.replace('.txt', '')),
        );

    if (englishFiles.length === 0) return;

    if (!translateContent) {
        // Verification is read-only: just check for missing files (don't create
        // the target directory — a missing file already reads as missing).
        const missingFiles = englishFiles.filter(
            (filename) => !fs.existsSync(path.join(targetHowToDir, filename)),
        );
        if (missingFiles.length > 0) {
            log.bad(`Missing ${missingFiles.length} files`);
        }
        return;
    }

    // Translation mode - ensure the target directory exists before writing.
    try {
        if (!fs.existsSync(targetHowToDir)) {
            fs.mkdirSync(targetHowToDir, { recursive: true });
        }
    } catch (error) {
        log.bad(`Failed to create the directory: ${error}`);
        return;
    }

    // Translation mode - resolve the target locale via the active backend.
    const backend = translator ?? getTranslator();
    let targetLocale: string;
    try {
        targetLocale = await backend.getTargetLocale(language, regions);
    } catch (error) {
        log.bad(`Failed to get the target locale: ${error}`);
        return;
    }

    const sourceLocale = 'en-US';
    let translatedCount = 0;
    let totalFiles = englishFiles.length;

    for (const filename of englishFiles) {
        const englishFilePath = path.join(englishHowToDir, filename);
        const targetFilePath = path.join(targetHowToDir, filename);

        try {
            const translated = await translateHowToFile(
                log,
                filename,
                englishFilePath,
                targetFilePath,
                sourceLocale,
                targetLocale,
                override,
                backend,
                localeText,
            );
            if (translated) translatedCount++;
        } catch (error) {
            log.bad(`Failed to process ${filename}: ${error}`);
        }
    }

    if (translatedCount > 0) {
        log.good(`Translated ${translatedCount}/${totalFiles} files`);
    } else {
        log.good(`No files needed translation`);
    }
}

/**
 * Whether a localized example is still the same program as the one it came
 * from, structurally.
 *
 * Localizing an example is supposed to swap names and text — `Instrument.piano`
 * for `🔈.🎹`, `'piano'` for `'Klavier'` — and change nothing else. A
 * translator is a language model, though, and it sometimes returns code with
 * the whitespace eaten: `Track(tune instrument: …)` comes back as
 * `Track(tuneinstrument: …)`, and `[1 5 8 5 6 3 1 ø]` as `[1585631 ø]`. Both
 * still *parse*, so the old guard — "did an Example come out?" — waved them
 * through, and the damage only surfaced later as conflicts in `npm run
 * locales`.
 *
 * Comparing the sequence of token kinds catches exactly that: renaming and
 * re-texting preserve it, while a swallowed space merges two names into one and
 * a swallowed delimiter changes it outright.
 */
export function localizedExampleIsSound(
    original: Example,
    localized: Example,
): boolean {
    const kinds = (example: Example) =>
        example
            .leaves()
            .filter((leaf): leaf is Token => leaf instanceof Token)
            .map((token) => token.getTypes().join('|'))
            .join(' ');
    return kinds(original) === kinds(localized);
}

/**
 * Whether a how-to still has to be translated for its locale.
 *
 * The middle case is the one worth naming: **a target that still reads exactly
 * like its English source has not been translated, it has been copied.**
 * Without it the only trigger was "the file doesn't exist", which made a trap
 * out of the verifier — a missing how-to is reported as an error, the obvious
 * way to silence that is to copy the English file into each locale, and doing
 * so made the file permanently invisible here. A copy carries no `$~` either,
 * so `--override` couldn't see it. Every how-to in the music category reached
 * that state and stayed English across all 29 locales while every other how-to
 * was translated.
 *
 * Byte equality is a safe test: a real translation of prose is never identical
 * to its source, and a false positive costs one wasted re-translation rather
 * than any lost work.
 */
export function howToNeedsTranslation(
    english: string,
    target: string,
    isNewFile: boolean,
    override: boolean,
): boolean {
    if (isNewFile) return true;
    if (target === english) return true;
    return override && isMachineTranslated(target);
}

/**
 * Translate a single how-to file. Returns true if a translation actually
 * occurred (i.e. a request was sent and the target file was rewritten),
 * false when nothing needed translating (target exists and isn't a
 * machine-translated override candidate, or there are no translatable
 * phrases in the parsed how-to).
 */
async function translateHowToFile(
    log: Log,
    filename: string,
    englishFilePath: string,
    targetFilePath: string,
    sourceLocale: string,
    targetLocale: string,
    override: boolean,
    translator: Translator,
    localeText: LocaleText | undefined,
): Promise<boolean> {
    // Read English content
    let englishContent: string;
    try {
        englishContent = fs.readFileSync(englishFilePath, 'utf-8');
    } catch (error) {
        throw new Error(`Failed to read English file: ${error}`);
    }

    let targetLines: string;
    let isNewFile = false;

    // Check if target file exists and read it
    if (fs.existsSync(targetFilePath)) {
        try {
            const targetContent = fs.readFileSync(targetFilePath, 'utf-8');
            targetLines = targetContent;
        } catch (error) {
            throw new Error(`Failed to read target file: ${error}`);
        }
    } else {
        // File doesn't exist, copy English content as starting point
        targetLines = englishContent;
        isNewFile = true;
    }

    if (
        !howToNeedsTranslation(englishContent, targetLines, isNewFile, override)
    )
        return false;

    // Parse the target text as a how to.
    const parsedHowTo = parseHowTo(filename.replace('.txt', ''), targetLines);

    // Find all of the words in the content.
    if (parsedHowTo.how === null) return false;

    // Prose runs to translate, and embedded \code\ examples to localize (so a
    // how-to reads natively like the tutorial — not English code in localized
    // prose). These are disjoint: code tokens are never Sym.Words.
    const phrases = parsedHowTo.how.content
        .nodes()
        .filter(
            (node): node is Token =>
                node instanceof Token && node.isSymbol(Sym.Words),
        );
    const examples = parsedHowTo.how.content
        .nodes()
        .filter((node): node is Example => node instanceof Example);

    if (phrases.length === 0 && examples.length === 0) return false;

    // Translate the title + prose, and localize each example by passing its full
    // \code\ source — the translator localizes the embedded program's names/text.
    const translations = await translator.translate(
        log,
        [
            parsedHowTo.how.title,
            ...phrases.map((phrase) => phrase.getText()),
            ...examples.map((example) => example.toWordplay()),
        ],
        sourceLocale,
        targetLocale,
        localeText,
    );

    if (translations === undefined) {
        throw new Error('Translation service returned no results');
    }

    const expected = 1 + phrases.length + examples.length;
    if (translations.length !== expected) {
        throw new Error(
            `Translation count mismatch: expected ${expected}, got ${translations.length}`,
        );
    }

    // Apply translations to the title (keep the original if it couldn't translate).
    parsedHowTo.how.title = translations[0] ?? parsedHowTo.how.title;

    let markup = parsedHowTo.how.content;
    // Replace each prose run with its translation (null → keep the original).
    for (let i = 0; i < phrases.length; i++) {
        const translation = translations[1 + i];
        if (translation === null) continue;
        const tokens = markup.leaves();
        const tokenBefore = tokens[tokens.indexOf(phrases[i]) - 1];
        const tokenAfter = tokens[tokens.indexOf(phrases[i]) + 1];
        const nameBefore =
            tokenBefore !== undefined &&
            (tokenBefore.isSymbol(Sym.Name) ||
                tokenBefore.isSymbol(Sym.Concept));
        const nameAfter =
            tokenAfter !== undefined &&
            (tokenAfter.isSymbol(Sym.Name) || tokenAfter.isSymbol(Sym.Concept));
        markup = markup.replace(
            phrases[i],
            new Token(
                (nameBefore ? ' ' : '') + translation + (nameAfter ? ' ' : ''),
                Sym.Words,
            ),
        );
    }
    // Replace each example with its localized \code\ (null → keep original code).
    for (let i = 0; i < examples.length; i++) {
        const localized = translations[1 + phrases.length + i];
        if (localized === null) continue;
        const newExample = parseDoc(
            toTokens(DOCS_SYMBOL + localized + DOCS_SYMBOL),
        )
            .nodes()
            .find((node): node is Example => node instanceof Example);
        // Keep the English code rather than write something broken: a
        // structurally different example is a translation failure, not a
        // localization, and prose that survived is still worth writing.
        if (newExample === undefined) continue;
        if (!localizedExampleIsSound(examples[i], newExample)) {
            log.warning(
                `Kept the original code for one example in ${filename}: the localized version had a different structure.`,
            );
            continue;
        }
        markup = markup.replace(examples[i], newExample);
    }

    // Update the content.
    parsedHowTo.how.content = markup;

    // Write the translated file. (How-to `.txt` is a custom format Prettier has
    // no parser for, so writeFormatted writes it raw — but routes through the same
    // write-if-changed path as every other locale write.)
    try {
        await writeFormatted(targetFilePath, howToToString(parsedHowTo.how));
    } catch (error) {
        throw new Error(`Failed to write translated file: ${error}`);
    }

    log.good(`Translated ${filename}`);
    return true;
}
