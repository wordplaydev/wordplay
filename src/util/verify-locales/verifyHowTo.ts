import { howToToString, parseHowTo } from '@concepts/HowTo';
import type LanguageCode from '@locale/LanguageCode';
import { isMachineTranslated } from '@locale/LocaleText';
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
        log.bad(2, `Failed to read English how-to directory: ${error}`);
        return;
    }

    if (englishFiles.length === 0) return;

    // Ensure target directory exists
    try {
        if (!fs.existsSync(targetHowToDir)) {
            fs.mkdirSync(targetHowToDir, { recursive: true });
        }
    } catch (error) {
        log.bad(2, `Failed to create how-to directory for ${locale}: ${error}`);
        return;
    }

    if (!translateContent) {
        // Just check for missing files in verification mode
        const missingFiles = englishFiles.filter(
            (filename) => !fs.existsSync(path.join(targetHowToDir, filename)),
        );
        if (missingFiles.length > 0) {
            log.bad(
                2,
                `Missing ${missingFiles.length} how-to files for ${locale}`,
            );
        }
        return;
    }

    // Translation mode - resolve the target locale via the active backend.
    const translator = getTranslator();
    let targetLocale: string;
    try {
        targetLocale = await translator.getTargetLocale(language, regions);
    } catch (error) {
        log.bad(2, `Failed to get target locale for ${locale}: ${error}`);
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
            );
            if (translated) translatedCount++;
        } catch (error) {
            log.bad(3, `Failed to process how-to file ${filename}: ${error}`);
        }
    }

    if (translatedCount > 0) {
        log.good(
            2,
            `Translated ${translatedCount}/${totalFiles} how-to files for ${locale}`,
        );
    } else {
        log.good(2, `No how-to files needed translation for ${locale}`);
    }
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

    // Check if any lines need translation
    const needsTranslation =
        isNewFile || (override && isMachineTranslated(targetLines));

    if (!needsTranslation) return false;

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
    const translator = getTranslator();
    const translations = await translator.translate(
        log,
        [
            parsedHowTo.how.title,
            ...phrases.map((phrase) => phrase.getText()),
            ...examples.map((example) => example.toWordplay()),
        ],
        sourceLocale,
        targetLocale,
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
        if (newExample !== undefined)
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

    log.good(3, `Translated how-to file: ${filename}`);
    return true;
}
