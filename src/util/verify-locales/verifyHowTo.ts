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
import analyzeCode from '@util/verify-locales/analyzeCode';
import { retargetExamplesIn } from '@util/verify-locales/retargetExampleNames';
import {
    examplesIn,
    howToCoverage,
    pairHowToUnits,
    proseRunsIn,
    spacingLike,
} from '@util/verify-locales/pairHowTo';

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
    /** Whether to rewrite a how-to whose examples name inputs the locale no longer declares.
     *  Verify reports them instead, so it stays read-only. */
    fix = false,
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

    // Bring every how-to's examples back in line with the names this locale declares. Runs
    // in every mode, before the missing-file check below returns: a how-to's examples spell
    // names that live in the locale file, so re-translating one of those names strands them
    // (#1323), and the repair is deterministic, so it doesn't need a translation run.
    if (localeText !== undefined)
        retargetHowToExamples(
            log,
            englishHowToDir,
            targetHowToDir,
            englishFiles,
            localeText,
            fix,
        );

    if (!translateContent) {
        // Verification is read-only: just check for missing files (don't create
        // the target directory — a missing file already reads as missing).
        const missingFiles = englishFiles.filter(
            (filename) => !fs.existsSync(path.join(targetHowToDir, filename)),
        );
        if (missingFiles.length > 0) {
            log.bad(`Missing ${missingFiles.length} files`);
        }
        const behind = howTosBehindEnglish(
            englishHowToDir,
            targetHowToDir,
            englishFiles,
            locale,
        );
        if (behind.length > 0)
            log[HowToCoverageIsFatal ? 'bad' : 'warning'](
                `${behind.length} how-to(s) are missing content their en-US source has, so readers of this language can't see it: ${behind.join(', ')}. Re-translate with "+howto:<id>".`,
            );
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
                howtoIds !== undefined && howtoIds.length > 0,
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
 * Whether a how-to that says less than its English source fails the build.
 *
 * True: the backlog this was written for is gone. Every locale used to be behind
 * on most of the 37 how-tos, because until English became the skeleton nothing
 * could add a paragraph to a translation (#1365); one run over the how-tos
 * cleared 29 of the 30, buying only the unpaired units.
 */
export const HowToCoverageIsFatal = true;

/**
 * Files whose English has a prose run the target language has no counterpart
 * for, as `<locale>/<id>`. **Currently empty**, and every locale covers en-US.
 *
 * Kept because the case is linguistic rather than historical, so it will recur:
 * a run can be a bare function word that another language puts elsewhere or
 * drops, which is complete and correct and which a rule counting prose runs
 * cannot express — the collapse `checkReducedTemplates` allows for a pro-drop
 * language. The one entry this held was ne-NP's `show-when`, whose English ends
 * on the bare verb "Press "; a later re-translation happened to give Nepali a
 * run there too, so it was the model's choice rather than the language's, and
 * the entry went stale.
 *
 * Exempting by name rather than turning the gate off is what keeps every other
 * file held to it, and `howToStructureSync.test.ts` fails on an entry that no
 * longer names a file that is really behind, so this shrinks on its own.
 */
export const CoverageExemptions: string[] = [];

/**
 * The how-tos whose translation covers less than its en-US source does, by id.
 *
 * Shared by the verifier and the sweep, so `npm run locales` and the corpus test
 * answer the same question. A file that won't parse is left to the checks that
 * own parsing rather than counted as behind.
 */
export function howTosBehindEnglish(
    englishDir: string,
    targetDir: string,
    filenames: string[],
    /** The locale being checked, so its exemptions can be honoured. */
    locale?: string,
): string[] {
    const behind: string[] = [];
    for (const filename of filenames) {
        const id = filename.replace('.txt', '');
        if (
            locale !== undefined &&
            CoverageExemptions.includes(`${locale}/${id}`)
        )
            continue;
        const targetPath = path.join(targetDir, filename);
        if (!fs.existsSync(targetPath)) continue;
        let english, target;
        try {
            english = parseHowTo(
                id,
                fs.readFileSync(path.join(englishDir, filename), 'utf8'),
            );
            target = parseHowTo(id, fs.readFileSync(targetPath, 'utf8'));
        } catch {
            continue;
        }
        if (english.how === null || target.how === null) continue;
        const coverage = howToCoverage(english.how.content, target.how.content);
        if (
            coverage.prose < coverage.proseTotal ||
            coverage.examples < coverage.examplesTotal
        )
            behind.push(id);
    }
    return behind;
}

/**
 * Retarget the named inputs in each localized how-to's `\…\` examples to the names the
 * locale declares, writing the `.txt` sources when fixing. The generated `<code>-how.json`
 * bundle is rebuilt from these by `buildHowToBundle`, so the sources are what to repair.
 */
function retargetHowToExamples(
    log: Log,
    englishDir: string,
    targetDir: string,
    filenames: string[],
    locale: LocaleText,
    fix: boolean,
): void {
    let renamed = 0;
    let divergent = 0;
    let refused = 0;
    for (const filename of filenames) {
        const targetPath = path.join(targetDir, filename);
        if (!fs.existsSync(targetPath)) continue;
        let english: string;
        let localized: string;
        try {
            english = fs.readFileSync(path.join(englishDir, filename), 'utf8');
            localized = fs.readFileSync(targetPath, 'utf8');
        } catch {
            continue;
        }
        const result = retargetExamplesIn(english, localized, locale);
        renamed += result.renamed;
        divergent += result.divergent;
        refused += result.refused;
        if (fix && result.text !== localized)
            fs.writeFileSync(targetPath, result.text);
    }

    if (renamed > 0)
        log[fix ? 'good' : 'warning'](
            fix
                ? `Renamed ${renamed} input(s) in how-to examples to the name this locale declares.`
                : `${renamed} input(s) in how-to examples don't use the name this locale declares. Run "npm run locales-fix" to retarget them.`,
        );
    if (refused > 0)
        log.warning(
            `Left ${refused} how-to example(s) alone: retargeting them would have introduced a conflict.`,
        );
    if (divergent > 0)
        log.warning(
            `${divergent} how-to example(s) no longer have the same shape as their en-US source, so their names can't be retargeted.`,
        );
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
 *
 * The `named` case closes the sibling gap that comment describes. A how-to's
 * `.txt` carries no `$~` at all, so `override && isMachineTranslated` is false
 * for *every* translated how-to, and a translation that came back damaged —
 * stray English glue beside a restored `@link`, a lost space after a period —
 * could not be redone by any means short of deleting the file. Naming a how-to
 * with `+howto:<id>` has already answered the question the byte-equality
 * heuristic exists to answer ("which of these 36 do I redo?"), so under
 * `override` an explicit id is the trigger.
 */
export function howToNeedsTranslation(
    english: string,
    target: string,
    isNewFile: boolean,
    override: boolean,
    /** Whether this how-to was named explicitly with `+howto:<id>`. */
    named = false,
): boolean {
    if (isNewFile) return true;
    if (target === english) return true;
    if (override && named) return true;
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
    /** Whether `+howto:<id>` named this file, rather than it being one of all 36. */
    named: boolean,
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

    // Whether something forces the whole file to be bought again, independent of
    // what it already contains.
    const forced = howToNeedsTranslation(
        englishContent,
        targetLines,
        isNewFile,
        override,
        named,
    );

    // Parse ENGLISH for structure. The output is built from this tree, so a
    // paragraph the translation is missing can actually appear in it — parsing the
    // target here instead is what made `+howto:` unable to grow a file (#1365).
    const id = filename.replace('.txt', '');
    const english = parseHowTo(id, englishContent);
    if (english.how === null || english.spaces === null) {
        log.bad(
            `Couldn't parse the English how-to ${filename}: ${english.error}`,
        );
        return false;
    }

    // Parse the target for translations worth keeping.
    const parsedTarget = isNewFile ? null : parseHowTo(id, targetLines);
    const existing = parsedTarget?.how ?? null;

    // Prose runs to translate, and embedded \code\ examples to localize (so a
    // how-to reads natively like the tutorial — not English code in localized
    // prose). These are disjoint: code tokens are never Sym.Words.
    const phrases = proseRunsIn(english.how.content);
    const examples = examplesIn(english.how.content);

    if (phrases.length === 0 && examples.length === 0) return false;

    // Redo the whole file when there is nothing to keep, or when something forced
    // it — `+howto:<id>` under `override` has always meant "buy this one again".
    // Otherwise keep every paragraph the translation still has and buy only what
    // English has beyond it, which is the repair `+howto:` could never make.
    const redo = existing === null || forced;
    const reuse = redo
        ? {
              words: new Map<Token, string>(),
              examples: new Map<Example, Example>(),
          }
        : pairHowToUnits(english.how.content, existing.content);

    const phrasesToBuy = phrases.filter((phrase) => !reuse.words.has(phrase));
    const examplesToBuy = examples.filter(
        (example) => !reuse.examples.has(example),
    );
    const buyTitle = redo;

    // Nothing English has is missing here, so there is nothing to pay for. The
    // file may still be rewritten below by the caller's other passes; this one
    // is done.
    if (!buyTitle && phrasesToBuy.length === 0 && examplesToBuy.length === 0)
        return false;

    const translations = await translator.translate(
        log,
        [
            ...(buyTitle ? [english.how.title] : []),
            ...phrasesToBuy.map((phrase) => phrase.getText()),
            ...examplesToBuy.map((example) => example.toWordplay()),
        ],
        sourceLocale,
        targetLocale,
        localeText,
    );

    if (translations === undefined) {
        throw new Error('Translation service returned no results');
    }

    const expected =
        (buyTitle ? 1 : 0) + phrasesToBuy.length + examplesToBuy.length;
    if (translations.length !== expected) {
        throw new Error(
            `Translation count mismatch: expected ${expected}, got ${translations.length}`,
        );
    }

    const boughtPhrase = new Map<Token, string | null>();
    phrasesToBuy.forEach((phrase, index) =>
        boughtPhrase.set(phrase, translations[(buyTitle ? 1 : 0) + index]),
    );
    const boughtExample = new Map<Example, string | null>();
    examplesToBuy.forEach((example, index) =>
        boughtExample.set(
            example,
            translations[(buyTitle ? 1 : 0) + phrasesToBuy.length + index],
        ),
    );

    // The title: whatever we just bought, else what the translation already had.
    english.how.title = buyTitle
        ? (translations[0] ?? english.how.title)
        : (existing?.title ?? english.how.title);

    let markup = english.how.content;
    // English's spacing is the file's shape. A node kept from the translation
    // brings its own along, since `Spaces` is keyed by token identity and English
    // has no entry for a token it never parsed — without this a reused example
    // serializes with nothing between its tokens.
    let spaces =
        parsedTarget?.spaces == null
            ? english.spaces
            : english.spaces.withSpaces(parsedTarget.spaces);

    // Replace each prose run with its translation, keeping English where there is
    // none — the how-to counterpart of `keepOrPlacehold`'s rule that a failure
    // must not throw away what was already there.
    // Neighbours come from the original English tree, read once: every
    // replacement rebuilds the spine, so looking them up as we go finds nothing.
    const leaves = english.how.content.leaves();
    const positions = new Map(leaves.map((leaf, index) => [leaf, index]));

    for (const phrase of phrases) {
        const translation = reuse.words.get(phrase) ?? boughtPhrase.get(phrase);
        if (translation === undefined || translation === null) continue;
        const at = positions.get(phrase) ?? -1;
        const replacement = new Token(
            padLike(
                phrase.getText(),
                translation,
                at > 0 ? leaves[at - 1] : undefined,
                at >= 0 ? leaves[at + 1] : undefined,
            ),
            Sym.Words,
        );
        spaces = spaces.withReplacement(phrase, replacement);
        markup = markup.replace(phrase, replacement);
    }

    // Replace each example with its localized \code\.
    for (const example of examples) {
        const kept = reuse.examples.get(example);
        const localized = boughtExample.get(example);
        let replacement: Example | undefined = kept;
        if (replacement === undefined) {
            if (localized === undefined || localized === null) continue;
            const tokens = toTokens(DOCS_SYMBOL + localized + DOCS_SYMBOL);
            replacement = parseDoc(tokens)
                .nodes()
                .find((node): node is Example => node instanceof Example);
            // Its own spacing, or the program serializes onto a single line.
            spaces = spaces.withSpaces(tokens.getSpaces());
        }
        // Keep the English code rather than write something broken: a
        // structurally different example is a translation failure, not a
        // localization, and prose that survived is still worth writing.
        if (replacement === undefined) continue;
        if (!localizedExampleIsSound(example, replacement)) {
            log.warning(
                `Kept the original code for one example in ${filename}: the localized version had a different structure.`,
            );
            continue;
        }
        if (
            localeText !== undefined &&
            localizationAddsConflicts(
                example.toWordplay(english.spaces),
                replacement.toWordplay(spaces),
                localeText,
            )
        ) {
            log.warning(
                `Kept the original code for one example in ${filename}: the localized version doesn't analyze.`,
            );
            continue;
        }
        spaces = spaces.withReplacement(example, replacement);
        // Lay the localization out the way English lays this example out. Their
        // token sequences agree — `localizedExampleIsSound` just said so — and
        // English's is the only copy the old serializer never flattened.
        spaces = spacingLike(example, replacement, english.spaces, spaces);
        markup = markup.replace(example, replacement);
    }

    // Update the content.
    english.how.content = markup;

    // Write the translated file. (How-to `.txt` is a custom format Prettier has
    // no parser for, so writeFormatted writes it raw — but routes through the same
    // write-if-changed path as every other locale write.)
    try {
        await writeFormatted(
            targetFilePath,
            howToToString(english.how, spaces),
        );
    } catch (error) {
        throw new Error(`Failed to write translated file: ${error}`);
    }

    log.good(`Translated ${filename}`);
    return true;
}

/** The program inside a `\…\` example, for analysis. */
function codeOf(example: string): string {
    return example.replace(/^\\/, '').replace(/\\$/, '');
}

/**
 * Whether localizing this example broke it.
 *
 * `localizedExampleIsSound` compares token *kinds*, which a half-localized
 * example passes: a name is a name whichever language it is in. ne-NP's
 * `move-between-content` came back with the first half renamed and the rest
 * still English — declaring `कुञ्जी3: कुञ्जी()` and then reading `key` — which is a
 * token-for-token match and an `UnknownName` in a how-to's runnable preview.
 *
 * Both sides are analyzed in the **target** locale, so the comparison is like
 * for like: en-US names resolve everywhere, since every basis appends the en-US
 * fallback. Comparing counts rather than requiring zero is what lets a 🪲 example,
 * whose defect is the lesson, keep its localization.
 *
 * The same rule `retargetExampleNames` applies to a splice it is considering,
 * and for the same reason: a rewrite that analyzes worse than what it replaces
 * is not an improvement.
 */
function localizationAddsConflicts(
    english: string,
    localized: string,
    locale: LocaleText,
): boolean {
    const before = analyzeCode(codeOf(english), locale);
    const after = analyzeCode(codeOf(localized), locale);
    if (after.error !== undefined) return before.error === undefined;
    return after.conflicts.length > before.conflicts.length;
}

/**
 * Whether a translation could glue a word onto this neighbour. Prose can't (the
 * translator sees both runs and spaces them), and neither can nothing at all —
 * an edge of a paragraph needs no boundary.
 */
function abuts(token: Token | undefined): boolean {
    return token !== undefined && !token.isSymbol(Sym.Words);
}

/**
 * Give a translation the whitespace its source token carried at each edge, and a
 * word boundary where the translation needs one that English did not.
 *
 * Two different losses meet here. A markup `Words` token holds its own intra-line
 * spaces — `"a "` before a `\code\` span, `" has a "` between two links — and a
 * translator returns the words without them, so a paragraph came back as
 * `med/något/som tar en`. Copying the source's edges fixes that.
 *
 * But copying alone is not enough, because word order moves. English writes
 * `@Row, which arranges…`, where the run after the link begins with a comma and
 * wants no space; German writes `@Row machen, die…`, where it begins with a word
 * and must have one. So a space is added when English had none, the neighbour is
 * not prose, and the translation would otherwise run a word straight into it.
 * That is what the `nameBefore`/`nameAfter` rule was reaching for — but it added
 * a space unconditionally, so it double-spaced every link whose translation kept
 * its own, and it looked its neighbours up in a tree that had already been
 * rewritten, so it was wrong for every run after the first.
 */
export function padLike(
    source: string,
    translation: string,
    previous?: Token,
    next?: Token,
): string {
    // An all-whitespace source has no inside to pad around; leave it be.
    if (source.trim().length === 0) return source;
    // A zero-width SPACE is a translator's invisible artifact that the markup
    // tokenizer doesn't keep, so a body carrying one stops being markup partway
    // and the rest never renders — ten of them failed every id-ID how-to. Only
    // U+200B: the zero-width non-joiner beside it is orthography, and Persian,
    // Telugu and Kannada write it 1,054 times across these files.
    // A `Words` token cannot contain a newline — the tokenizer ends one there —
    // so a translation that came back with an internal line break silently
    // becomes two runs when the file is read again, and the document no longer
    // has the shape it was written with. Where the source's line breaks go is
    // decided by `Spaces`, not by anything inside a run.
    const text = translation
        .replaceAll('​', '')
        .replace(/\s*\n\s*/g, ' ')
        .trim();
    let lead = /^\s*/.exec(source)?.[0] ?? '';
    let trail = /\s*$/.exec(source)?.[0] ?? '';
    if (lead === '' && abuts(previous) && /^[\p{L}\p{N}]/u.test(text))
        lead = ' ';
    if (trail === '' && abuts(next) && /[\p{L}\p{N}]$/u.test(text)) trail = ' ';
    return lead + text + trail;
}
