import { howToToString, parseHowTo } from '@concepts/HowTo';
import type LanguageCode from '@locale/LanguageCode';
import { isAutomated } from '@locale/LocaleText';
import type { RegionCode } from '@locale/Regions';
import Sym from '@nodes/Sym';
import Token from '@nodes/Token';
import fs from 'fs';
import path from 'path';
import type Log from './Log';
import translate, { getGoogleTranslateTargetLocale } from './translate';

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

    // Translation mode - get target locale for Google Translate
    let targetLocale: string;
    try {
        targetLocale = await getGoogleTranslateTargetLocale(language, regions);
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
            await translateHowToFile(
                log,
                filename,
                englishFilePath,
                targetFilePath,
                sourceLocale,
                targetLocale,
                override,
            );
            translatedCount++;
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
 * Translate a single how-to file
 */
async function translateHowToFile(
    log: Log,
    filename: string,
    englishFilePath: string,
    targetFilePath: string,
    sourceLocale: string,
    targetLocale: string,
    override: boolean,
): Promise<void> {
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
        isNewFile || (override && isAutomated(targetLines));

    if (!needsTranslation) return;

    // Parse the target text as a how to.
    const parsedHowTo = parseHowTo(filename.replace('.txt', ''), targetLines);

    // Find all of the words in the content.
    if (parsedHowTo.how === null) return;

    const phrases = parsedHowTo.how.content
        .nodes()
        .filter(
            (node): node is Token =>
                node instanceof Token && node.isSymbol(Sym.Words),
        );

    if (phrases.length === 0) return;

    // Translate the title and content
    const translations = await translate(
        log,
        [parsedHowTo.how.title, ...phrases.map((phrase) => phrase.getText())],
        sourceLocale,
        targetLocale,
    );

    if (translations === undefined) {
        throw new Error('Translation service returned no results');
    }

    if (translations.length !== phrases.length + 1) {
        throw new Error(
            `Translation count mismatch: expected ${phrases.length}, got ${translations.length}`,
        );
    }

    // Apply translations to the title.
    parsedHowTo.how.title = translations[0];
    translations.shift();

    // Apply translations to the words in the markup, replacing the original tokens with the revised ones.
    let markup = parsedHowTo.how.content;
    for (let i = 0; i < translations.length; i++) {
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
                (nameBefore ? ' ' : '') +
                    translations[i] +
                    (nameAfter ? ' ' : ''),
                Sym.Words,
            ),
        );
    }

    // Update the content.
    parsedHowTo.how.content = markup;

    // Write the translated file
    try {
        fs.writeFileSync(
            targetFilePath,
            howToToString(parsedHowTo.how),
            'utf-8',
        );
    } catch (error) {
        throw new Error(`Failed to write translated file: ${error}`);
    }

    log.good(3, `Translated how-to file: ${filename}`);
}
