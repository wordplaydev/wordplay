import type LanguageCode from '@locale/LanguageCode';
import { MachineTranslated, isAutomated, isUnwritten } from '@locale/LocaleText';
import type { RegionCode } from '@locale/Regions';
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
        englishFiles = fs.readdirSync(englishHowToDir).filter((f) => f.endsWith('.txt'));
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
        const missingFiles = englishFiles.filter((filename) =>
            !fs.existsSync(path.join(targetHowToDir, filename)),
        );
        if (missingFiles.length > 0) {
            log.bad(2, `Missing ${missingFiles.length} how-to files for ${locale}`);
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
        log.good(2, `Translated ${translatedCount}/${totalFiles} how-to files for ${locale}`);
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

    const englishLines = englishContent.split('\n');
    let targetLines: string[];
    let isNewFile = false;

    // Check if target file exists and read it
    if (fs.existsSync(targetFilePath)) {
        try {
            const targetContent = fs.readFileSync(targetFilePath, 'utf-8');
            targetLines = targetContent.split('\n');
        } catch (error) {
            throw new Error(`Failed to read target file: ${error}`);
        }
    } else {
        // File doesn't exist, copy English content as starting point
        targetLines = [...englishLines];
        isNewFile = true;
    }

    // Check if any lines need translation
    const needsTranslation = isNewFile || targetLines.some((line) =>
        isUnwritten(line) || (override && isAutomated(line)),
    );

    if (!needsTranslation) return;

    // Extract strings that need translation
    const translationPairs: Array<{ lineIndex: number; originalText: string }> = [];

    for (let i = 0; i < targetLines.length; i++) {
        const line = targetLines[i];
        if (!line.trim()) continue; // Skip empty lines

        const needsLineTranslation = isNewFile || isUnwritten(line) || (override && isAutomated(line));
        if (needsLineTranslation) {
            // Clean the line of existing markers
            const cleanLine = line.replace(MachineTranslated, '').replace(/^\$~/, '').trim();
            if (cleanLine) {
                translationPairs.push({
                    lineIndex: i,
                    originalText: cleanLine,
                });
            }
        }
    }

    if (translationPairs.length === 0) return;

    // Extract just the text for translation
    const stringsToTranslate = translationPairs.map((pair) => pair.originalText);

    // Translate the strings
    const translations = await translate(log, stringsToTranslate, sourceLocale, targetLocale);

    if (!translations) {
        throw new Error('Translation service returned no results');
    }

    if (translations.length !== stringsToTranslate.length) {
        throw new Error(
            `Translation count mismatch: expected ${stringsToTranslate.length}, got ${translations.length}`,
        );
    }

    // Apply translations
    for (let i = 0; i < translations.length; i++) {
        const { lineIndex } = translationPairs[i];
        const translatedText = translations[i].trim();
        targetLines[lineIndex] = MachineTranslated + translatedText;
    }

    // Write the translated file
    try {
        fs.writeFileSync(targetFilePath, targetLines.join('\n'), 'utf-8');
    } catch (error) {
        throw new Error(`Failed to write translated file: ${error}`);
    }

    log.good(3, `Translated how-to file: ${filename}`);
}