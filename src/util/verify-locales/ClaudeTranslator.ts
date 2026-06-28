import Anthropic from '@anthropic-ai/sdk';
import DefaultLocale from '@locale/DefaultLocale';
import type LanguageCode from '@locale/LanguageCode';
import { TranslatableLocales } from '@locale/LanguageCode';
import { getGlossaryForPrompt } from '@locale/Glossary';
import { PLAIN_LANGUAGE_GUIDANCE } from '@locale/readingLevel';
import type Locale from '@locale/Locale';
import { stringToLocale } from '@locale/Locale';
import type LocaleText from '@locale/LocaleText';
import type { RegionCode } from '@locale/Regions';
import Project from '@db/projects/Project';
import translateProjectContent, {
    type RawTranslator,
} from '@db/projects/translateProjectContent';
import Source from '@nodes/Source';
import type Log from '@util/verify-locales/Log';
import { getLocaleJSON } from './LocaleSchema';
import {
    ConceptPattern,
    mismatchedDelimiter,
    repairMentionsPositional,
    restoreReferences,
    splitMarkupAndCode,
} from './protect';
import type Translator from './Translator';

/** Model used for locale translation. Opus for maximum quality (cost is
 *  negligible at this volume — see docs/translation-evaluation.md). */
const MODEL = 'claude-opus-4-8';
/** How many markup segments to send per request. */
const CHUNK_SIZE = 100;
/** Output cap; structured JSON of ~100 short strings stays well under this. */
const MAX_TOKENS = 16000;

/** The structured-output schema: a translations array parallel to the input. */
const SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        translations: { type: 'array', items: { type: 'string' } },
    },
    required: ['translations'],
};

/** Type guard for the parsed structured output without an unsafe cast. */
function hasTranslations(data: unknown): data is { translations: unknown } {
    return typeof data === 'object' && data !== null && 'translations' in data;
}

/** Parse and validate the model's JSON response, returning the translations
 *  only when they're a string array of the expected length. */
export function parseTranslations(
    text: string,
    expected: number,
): string[] | undefined {
    let data: unknown;
    try {
        data = JSON.parse(text);
    } catch {
        return undefined;
    }
    if (!hasTranslations(data)) return undefined;
    const translations = data.translations;
    if (!Array.isArray(translations)) return undefined;
    if (!translations.every((t): t is string => typeof t === 'string'))
        return undefined;
    return translations.length === expected ? translations : undefined;
}

/** A one-line diagnosis of an Anthropic SDK error, with a hint — the Claude
 *  analog of `describeApiError`. */
export function describeClaudeError(error: unknown): string {
    if (error instanceof Anthropic.AuthenticationError)
        return 'authentication failed — set ANTHROPIC_API_KEY to a valid key';
    if (error instanceof Anthropic.PermissionDeniedError)
        return "the API key lacks permission for this model, or the org can't use it";
    if (error instanceof Anthropic.RateLimitError)
        return 'rate limited even after retries — lower concurrency or wait';
    if (error instanceof Anthropic.BadRequestError)
        return `bad request — ${error.message}`;
    if (error instanceof Anthropic.APIConnectionError)
        return 'could not reach the Anthropic API — check the network';
    if (error instanceof Anthropic.APIError)
        return `Anthropic API error ${error.status ?? ''} — ${error.message}`;
    return String(error);
}

export default class ClaudeTranslator implements Translator {
    readonly id = 'claude';

    // The SDK reads ANTHROPIC_API_KEY from the environment. Extra app-level
    // retries on top of the SDK's defaults for long offline runs.
    private readonly client = new Anthropic({ maxRetries: 4 });

    getTargetLocale(
        language: LanguageCode,
        regions: RegionCode[],
    ): Promise<string> {
        // Claude has no supported-languages endpoint and accepts a locale code
        // directly; pick the first declared region if any.
        return Promise.resolve(
            regions.length > 0 ? `${language}-${regions[0]}` : language,
        );
    }

    getSupportedLocales(): Promise<Locale[]> {
        // No enumeration endpoint; Claude covers the full offered set.
        return Promise.resolve(TranslatableLocales);
    }

    /** The cached system prompt: preservation rules + reading-level target +
     *  glossary. Stable across all batches of a run (per source/target/glossary)
     *  so it caches. `targetText` supplies the target locale's translated glossary
     *  words so bare key terms localize; omit it (e.g. before the glossary itself
     *  is translated) for the en-only glossary form. */
    private buildSystem(
        sourceLocale: string,
        targetLocale: string,
        targetText: LocaleText | undefined,
    ): string {
        return `You are an expert localizer for Wordplay, a programming language for interactive typography. Translate each given string from ${sourceLocale} to ${targetLocale}.

Rules:
- Translate the natural-language text only. Preserve Wordplay markup exactly:
  - Keep every @Concept reference verbatim (e.g. @Phrase, @FunctionDefinition) — never translate, transliterate, or alter them.
  - Keep every $name reference verbatim (e.g. $value, $type) — never translate, transliterate, or alter them.
  - Do not add or remove formatting symbols (*, _, \`, backslashes).
- Write for young, multilingual learners.
- Key terms — the glossary below. When one of these words appears as ordinary text (a bare word, NOT a $name mention or @Concept link above), translate it to its listed target-language word and use that same word consistently. Where a line shows only an English word, translate it naturally and keep that choice consistent.
${getGlossaryForPrompt(targetText)}

${PLAIN_LANGUAGE_GUIDANCE}`;
    }

    /** Translate one chunk of markup segments. Returns a same-length array; a
     *  `null` element means that string couldn't be translated (the caller marks
     *  it unwritten rather than shipping English). Truncation (`max_tokens`) is
     *  retried by splitting the chunk — large atomic docs make a 100-string batch
     *  overflow; a single string that still overflows yields `null`. A malformed
     *  response is retried once. Throws on a fatal error (caller aborts). */
    private async translateChunk(
        log: Log,
        chunk: string[],
        system: string,
        sourceLocale: string,
        targetLocale: string,
        retriedParse = false,
    ): Promise<(string | null)[]> {
        const response = await this.client.messages.create({
            model: MODEL,
            max_tokens: MAX_TOKENS,
            system: [
                {
                    type: 'text',
                    text: system,
                    cache_control: { type: 'ephemeral' },
                },
            ],
            output_config: { format: { type: 'json_schema', schema: SCHEMA } },
            messages: [
                {
                    role: 'user',
                    content: `Translate these ${chunk.length} strings from ${sourceLocale} to ${targetLocale}. Return JSON {"translations":[...]} with exactly ${chunk.length} entries, in the same order.\n\n${JSON.stringify(chunk)}`,
                },
            ],
        });

        if (response.stop_reason === 'refusal') {
            log.warning(2, 'Claude refused a chunk; marking it unwritten.');
            return chunk.map(() => null);
        }
        if (response.stop_reason === 'max_tokens') {
            // Output overflowed the cap. Split the batch and retry so big atomic
            // docs fit; a single string that still overflows can't be translated.
            if (chunk.length <= 1) {
                log.warning(
                    2,
                    'Claude truncated a single string; marking it unwritten.',
                );
                return [null];
            }
            const mid = Math.ceil(chunk.length / 2);
            log.warning(
                2,
                `Claude response truncated; retrying in halves (${chunk.length} → ${mid}+${chunk.length - mid}).`,
            );
            return [
                ...(await this.translateChunk(
                    log,
                    chunk.slice(0, mid),
                    system,
                    sourceLocale,
                    targetLocale,
                )),
                ...(await this.translateChunk(
                    log,
                    chunk.slice(mid),
                    system,
                    sourceLocale,
                    targetLocale,
                )),
            ];
        }

        const textBlock = response.content.find((b) => b.type === 'text');
        const parsed =
            textBlock !== undefined
                ? parseTranslations(textBlock.text, chunk.length)
                : undefined;
        if (parsed === undefined) {
            if (!retriedParse)
                return this.translateChunk(
                    log,
                    chunk,
                    system,
                    sourceLocale,
                    targetLocale,
                    true,
                );
            // Still malformed (usually a length mismatch) after a retry. Isolate
            // the culprit by splitting instead of nulling the whole batch, so one
            // bad string doesn't cost ~100 others; a lone string that still fails
            // is marked unwritten.
            if (chunk.length <= 1) {
                log.warning(
                    2,
                    'Claude response did not match the expected shape; marking it unwritten.',
                );
                return [null];
            }
            const mid = Math.ceil(chunk.length / 2);
            log.warning(
                2,
                `Claude response shape mismatch; retrying in halves (${chunk.length} → ${mid}+${chunk.length - mid}).`,
            );
            return [
                ...(await this.translateChunk(
                    log,
                    chunk.slice(0, mid),
                    system,
                    sourceLocale,
                    targetLocale,
                )),
                ...(await this.translateChunk(
                    log,
                    chunk.slice(mid),
                    system,
                    sourceLocale,
                    targetLocale,
                )),
            ];
        }
        return parsed;
    }

    /** Cache of loaded target locale texts, used to localize embedded examples'
     *  standard-library references to the locale's names. */
    private readonly localeTextCache = new Map<
        string,
        LocaleText | undefined
    >();

    /** Load a locale's text for example localization. The verifier loads locale
     *  JSON as LocaleText throughout (see DefaultLocale / LocaleSchema); we
     *  follow that pattern since LocaleText is too large for a runtime guard. */
    private loadLocaleText(log: Log, locale: string): LocaleText | undefined {
        const cached = this.localeTextCache.get(locale);
        if (cached !== undefined || this.localeTextCache.has(locale))
            return cached;
        const json = getLocaleJSON(log, locale);
        const text = json === undefined ? undefined : (json as LocaleText);
        this.localeTextCache.set(locale, text);
        return text;
    }

    /** Analyze a project and count its conflicted nodes (mirrors verifyTutorial). */
    private countConflicts(project: Project): number {
        project.analyze();
        return Array.from(project.getConflictedNodes().values()).flat().length;
    }

    /**
     * Localize one embedded `\code\` example so it reads in the target language:
     * names (and their references), text literals, and docs are replaced, and
     * standard-library references use the target locale's names. The original is
     * kept verbatim if anything fails or if localization introduces new
     * conflicts (the "re-serialize, re-analyze conflict-free" guarantee).
     */
    private async localizeExample(
        log: Log,
        code: string,
        sourceLocale: string,
        targetLocale: string,
        targetLocaleText: LocaleText | undefined,
        system: string,
    ): Promise<string> {
        const sourceObj = stringToLocale(sourceLocale);
        const targetObj = stringToLocale(targetLocale);
        if (sourceObj === undefined || targetObj === undefined) return code;

        // Strip the `\…\` delimiters to recover the program source.
        let inner = code;
        let terminated = false;
        if (inner.startsWith('\\')) inner = inner.slice(1);
        if (inner.endsWith('\\')) {
            inner = inner.slice(0, -1);
            terminated = true;
        }
        if (inner.trim().length === 0) return code;

        try {
            const project = Project.make(
                null,
                'example',
                new Source('start', inner),
                [],
                DefaultLocale,
            );
            const baseline = this.countConflicts(project);

            // Reuse the markup chunk translator to translate the example's
            // names/text/docs (translateProjectContent rebuilds valid names).
            const rawTranslator: RawTranslator = async (texts) => {
                if (texts.length === 0) return [];
                try {
                    const out = await this.translateChunk(
                        log,
                        texts,
                        system,
                        sourceLocale,
                        targetLocale,
                    );
                    // Keep the original for any element that couldn't translate, so
                    // the example stays a valid program (a partial failure here just
                    // means a name/text isn't localized, not a broken example).
                    return out.map((t, i) => t ?? texts[i]);
                } catch {
                    return null;
                }
            };

            const localized = await translateProjectContent(
                project,
                sourceObj,
                targetObj,
                rawTranslator,
                targetLocaleText,
                true,
            );
            if (localized === null) return code;

            const newInner = localized.getSources()[0]?.toWordplay();
            if (newInner === undefined) return code;

            // A nested example (e.g. a formatted `…` literal containing `\code\`)
            // can come back from the model with a doubled/orphaned delimiter. That
            // re-parses conflict-free in isolation but breaks the doc it's embedded
            // in, so the conflict check below misses it — compare delimiter counts
            // to the source and keep the original example if they differ.
            if (mismatchedDelimiter(inner, newInner) !== undefined) {
                log.warning(
                    2,
                    'Localized example left an unbalanced delimiter; keeping the original.',
                );
                return code;
            }

            // Re-parse + re-analyze in the target locale; keep the original if
            // localization introduced conflicts the source didn't have.
            const reparsed = Project.make(
                null,
                'example',
                new Source('start', newInner),
                [],
                targetLocaleText ?? DefaultLocale,
            );
            if (this.countConflicts(reparsed) > baseline) {
                log.warning(
                    2,
                    'Localized example introduced conflicts; keeping the original.',
                );
                return code;
            }

            return terminated ? `\\${newInner}\\` : `\\${newInner}`;
        } catch (error) {
            log.warning(
                2,
                `Could not localize embedded example; keeping the original: ${String(error)}`,
            );
            return code;
        }
    }

    async translate(
        log: Log,
        text: string[],
        sourceLocale: string,
        targetLocale: string,
        targetText?: LocaleText,
    ): Promise<(string | null)[] | undefined> {
        // Split each string into markup and code segments. Markup is translated
        // as text; `\code\` (embedded Wordplay programs) is localized separately
        // below so each reads natively while staying a valid, conflict-free program.
        const allSegments = text.map((s) => splitMarkupAndCode(s));

        // Collect the non-empty markup segments to translate, remembering where
        // each came from so we can reassemble.
        const units: string[] = [];
        const unitLocations: Array<{ string: number; segment: number }> = [];
        allSegments.forEach((segments, stringIndex) =>
            segments.forEach((seg, segmentIndex) => {
                if (seg.kind === 'markup' && seg.text.trim().length > 0) {
                    units.push(seg.text);
                    unitLocations.push({
                        string: stringIndex,
                        segment: segmentIndex,
                    });
                }
            }),
        );

        const system = this.buildSystem(sourceLocale, targetLocale, targetText);

        // Translate units in chunks; a fatal error aborts the whole locale.
        // Log per-chunk progress: a phase can be thousands of segments and only
        // reports completion at the very end otherwise (this is long-running).
        const translatedUnits: (string | null)[] = [];
        for (let i = 0; i < units.length; i += CHUNK_SIZE) {
            const chunk = units.slice(i, i + CHUNK_SIZE);
            try {
                translatedUnits.push(
                    ...(await this.translateChunk(
                        log,
                        chunk,
                        system,
                        sourceLocale,
                        targetLocale,
                    )),
                );
                log.say(
                    3,
                    `… ${Math.min(i + CHUNK_SIZE, units.length)}/${units.length} text segments (${sourceLocale}→${targetLocale})`,
                );
            } catch (error) {
                log.bad(
                    2,
                    `Translation stopped (${sourceLocale}→${targetLocale}): ${describeClaudeError(error)}`,
                );
                return undefined;
            }
        }

        // Localize each unique embedded `\code\` example so it reads natively in
        // the target language (names/text/docs replaced, references retargeted).
        // Deduplicated and done once per example; failures fall back to verbatim.
        const targetLocaleText =
            targetText ?? this.loadLocaleText(log, targetLocale);
        const codeMap = new Map<string, string>();
        // Example localization is serial and the slow part of a run (each is a
        // full parse/translate/re-analyze cycle), so log progress as we go.
        const uniqueCodes = [
            ...new Set(
                allSegments.flatMap((segments) =>
                    segments
                        .filter((seg) => seg.kind === 'code')
                        .map((seg) => seg.text),
                ),
            ),
        ];
        if (uniqueCodes.length > 0)
            log.say(
                3,
                `Localizing ${uniqueCodes.length} embedded examples (${sourceLocale}→${targetLocale})…`,
            );
        for (let c = 0; c < uniqueCodes.length; c++) {
            codeMap.set(
                uniqueCodes[c],
                await this.localizeExample(
                    log,
                    uniqueCodes[c],
                    sourceLocale,
                    targetLocale,
                    targetLocaleText,
                    system,
                ),
            );
            if ((c + 1) % 25 === 0 || c + 1 === uniqueCodes.length)
                log.say(
                    3,
                    `… ${c + 1}/${uniqueCodes.length} examples localized`,
                );
        }

        // Reassemble each string: translated markup in place, localized code.
        let unitIndex = 0;
        const result: (string | null)[] = allSegments.map(
            (segments, stringIndex) => {
                let failed = false;
                const rebuilt = segments
                    .map((seg) => {
                        if (seg.kind === 'code')
                            return codeMap.get(seg.text) ?? seg.text;
                        if (seg.text.trim().length === 0) return seg.text;
                        const unit = translatedUnits[unitIndex++];
                        if (unit === null) failed = true;
                        return unit ?? '';
                    })
                    .join('');
                // A markup unit couldn't be translated → signal null so the caller
                // keeps the source unwritten ($?) rather than shipping English.
                if (failed) return null;
                // Safety belt (cross-backend repair): restore mangled @Concept
                // links and $name mentions. If the `\…\`/`` `…` `` delimiters no
                // longer match the source, the string would break tokenization —
                // signal null instead of shipping a corrupt (or English) string.
                const source = text[stringIndex];
                const repaired = repairMentionsPositional(
                    source,
                    restoreReferences(source, rebuilt, ConceptPattern),
                );
                if (mismatchedDelimiter(source, repaired) !== undefined) {
                    log.warning(
                        2,
                        `A translation left an unbalanced delimiter; marking it unwritten (${targetLocale}).`,
                    );
                    return null;
                }
                return repaired;
            },
        );

        log.good(
            2,
            `Translated ${text.length} strings from ${sourceLocale} to ${targetLocale} with Claude.`,
        );
        return result;
    }
}
