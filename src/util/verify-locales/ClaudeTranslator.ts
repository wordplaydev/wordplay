import Anthropic from '@anthropic-ai/sdk';
import DefaultLocale from '@locale/DefaultLocale';
import type LanguageCode from '@locale/LanguageCode';
import { TranslatableLocales } from '@locale/LanguageCode';
import { getConventionsForPrompt } from '@locale/getConventionsForPrompt';
import { getGlossaryForPrompt } from '@locale/Glossary';
import { getPluralCount, getPluralRulesForPrompt } from '@locale/plurals';
import { PLAIN_LANGUAGE_GUIDANCE } from '@locale/readingLevel';
import { chunkUnits } from '@util/chunkUnits';
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
    hasUnclosedText,
    mismatchedConceptLinks,
    mismatchedPluralBranch,
    mismatchedDelimiter,
    hasResidualLinkMask,
    protectConceptLinks,
    repairMentionsPositional,
    restoreConceptLinks,
    restoreReferences,
    splitMarkupAndCode,
} from './protect';
import type Translator from './Translator';
import type { TranslatorUsage } from './Translator';

/**
 * The model that carries the bulk of a run — prose, docs, examples — chosen for
 * price (2.5× cheaper than Opus per token, both directions). The validators
 * downstream (delimiters, concept links, residual masks, example conflict
 * checks) are what make a cheaper model safe here: anything it garbles is
 * caught and retried on the repair model rather than shipped.
 */
const DEFAULT_MODEL =
    process.env.WORDPLAY_TRANSLATOR_MODEL ?? 'claude-sonnet-5';
/**
 * The stronger model, reserved for the work where a mistake is expensive or
 * already happened: per-string retries of strings the default model garbled,
 * and identifier names (`options.names`), where a bad output is a cross-locale
 * name collision rather than one awkward sentence. Those are a tiny fraction
 * of a run's tokens, so the quality is nearly free.
 */
const REPAIR_MODEL =
    process.env.WORDPLAY_TRANSLATOR_REPAIR_MODEL ?? 'claude-opus-4-8';

/**
 * $ per million tokens, from https://platform.claude.com/docs/en/about-claude/pricing
 * (checked 2026-08-19). Cache multipliers per the same page: a 5-minute cache
 * write bills at 1.25× the input price, a cache read at 0.1×. A model missing
 * here reports its tokens with no dollar estimate rather than a wrong one.
 */
const PRICES = new Map<string, { input: number; output: number }>([
    ['claude-sonnet-5', { input: 2, output: 10 }],
    ['claude-opus-5', { input: 5, output: 25 }],
    ['claude-opus-4-8', { input: 5, output: 25 }],
    ['claude-haiku-4-5', { input: 1, output: 5 }],
]);

/** Estimate the dollar cost of one model's usage, or undefined if the model's
 *  price isn't known. */
export function estimateCost(
    usage: Omit<TranslatorUsage, 'cost'>,
): number | undefined {
    const price = PRICES.get(usage.model);
    if (price === undefined) return undefined;
    return (
        (usage.inputTokens * price.input +
            usage.outputTokens * price.output +
            usage.cacheReadTokens * price.input * 0.1 +
            usage.cacheWriteTokens * price.input * 1.25) /
        1_000_000
    );
}

/**
 * Translate only the distinct strings in `units`, mapping the results back to
 * every occurrence. Locale files repeat boilerplate (~15% of en-US's strings
 * are duplicates of another), and two identical masked units always translate
 * identically — each occurrence still restores its own `@Concept` links, since
 * masking replaced them with position-stable `⟦n⟧` placeholders.
 */
export async function translateDeduped(
    units: string[],
    translateUnique: (unique: string[]) => Promise<(string | null)[]>,
): Promise<(string | null)[]> {
    const unique = [...new Set(units)];
    const translated = await translateUnique(unique);
    const byText = new Map<string, string | null>(
        unique.map((unit, index) => [unit, translated[index] ?? null]),
    );
    return units.map((unit) => byText.get(unit) ?? null);
}
/**
 * Translate only the units this run hasn't already produced under the same key,
 * mapping remembered results back into place.
 *
 * `translateDeduped` dedupes within one request; this remembers across them,
 * which matters because the bulk phase is sliced into several calls so it can
 * checkpoint — without it, every duplicate straddling a slice boundary would be
 * bought twice. Only successes are remembered: a `null` is a failure, and a
 * later slice asking again is a retry, not waste.
 */
export async function translateMemoized(
    units: string[],
    memo: Map<string, string>,
    keyOf: (unit: string) => string,
    translateMissing: (pending: string[]) => Promise<(string | null)[]>,
): Promise<(string | null)[]> {
    const pending = units.filter((unit) => !memo.has(keyOf(unit)));
    const translated =
        pending.length > 0 ? await translateMissing(pending) : [];
    const fresh = new Map<string, string | null>(
        pending.map((unit, index) => [unit, translated[index] ?? null]),
    );
    for (const [unit, value] of fresh)
        if (value !== null) memo.set(keyOf(unit), value);
    return units.map(
        (unit) => memo.get(keyOf(unit)) ?? fresh.get(unit) ?? null,
    );
}

// The request-chunking policy lives in a dependency-free module so browser code
// (the in-app project translator) can share the same bounds; re-exported here so
// this file's importers and chunkUnits.test.ts are unchanged.
export { chunkUnits };

/** Output cap; structured JSON of a chunk this size stays well under this. */
const MAX_TOKENS = 16000;
/**
 * Per-request ceiling, and how many times a failed request is retried.
 *
 * This is a backstop for a wedged request, not a pace-setter: with chunks this
 * small a request answers in seconds, so the ceiling should never be reached.
 * A previous attempt set it to two minutes to stop a run hanging silently, and
 * that cut off legitimate work instead — the answer to an opaque wait is to
 * report progress, which the chunk loop now does, not to give up sooner.
 */
const RequestTimeout = 600_000;
const MaxRetries = 2;

/** The structured-output schema: each translation echoes its source `index`, so
 *  results reconcile by id rather than by position. A miscount (dropped/merged
 *  item) then isolates to the missing index instead of failing the whole batch. */
const SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        translations: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    index: { type: 'integer' },
                    text: { type: 'string' },
                },
                required: ['index', 'text'],
            },
        },
    },
    required: ['translations'],
};

/** Type guard for the parsed structured output without an unsafe cast. */
function hasTranslations(data: unknown): data is { translations: unknown } {
    return typeof data === 'object' && data !== null && 'translations' in data;
}

/** Reconcile the model's id-keyed response into a `(string | null)[]` of length
 *  `expected`: each `{ index, text }` with an in-range index and string text
 *  fills that slot; missing / out-of-range / duplicate / non-string entries stay
 *  `null` (the caller marks those unwritten). Returns `undefined` only when the
 *  response is wholly unparseable (bad JSON or wrong outer shape), so the caller
 *  can retry. Length need not match — that's the point. */
export function reconcileTranslations(
    text: string,
    expected: number,
): (string | null)[] | undefined {
    let data: unknown;
    try {
        data = JSON.parse(text);
    } catch {
        return undefined;
    }
    if (!hasTranslations(data) || !Array.isArray(data.translations))
        return undefined;
    const result: (string | null)[] = new Array<string | null>(expected).fill(
        null,
    );
    for (const item of data.translations) {
        if (
            typeof item === 'object' &&
            item !== null &&
            'index' in item &&
            'text' in item &&
            typeof item.index === 'number' &&
            Number.isInteger(item.index) &&
            item.index >= 0 &&
            item.index < expected &&
            typeof item.text === 'string' &&
            // First valid translation for an index wins; ignore later duplicates.
            result[item.index] === null
        )
            result[item.index] = item.text;
    }
    return result;
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
    // A spend cap arrives as a 400, so it lands here rather than in
    // RateLimitError — and reads as a malformed request, which is the one thing
    // it isn't. It is also the only failure that resolves on a date rather than
    // by changing anything, so say so plainly.
    if (error instanceof Anthropic.BadRequestError)
        return /usage limit/i.test(error.message)
            ? `the account's API usage limit is spent, so nothing more will translate until it resets or is raised — ${error.message}`
            : `bad request — ${error.message}`;
    // Before APIConnectionError, which it extends. Getting this order wrong
    // reports a deadline we set as a network we can't reach, and sends whoever
    // reads it looking at their connection and their API key — neither of
    // which had anything to do with it.
    if (error instanceof Anthropic.APIConnectionTimeoutError)
        return `the request didn't finish inside the ${Math.round(RequestTimeout / 1000)}s client timeout (${MaxRetries + 1} attempts) — it was reaching the API, so try fewer segments per request rather than a longer wait`;
    if (error instanceof Anthropic.APIConnectionError)
        return 'could not reach the Anthropic API — check the network';
    if (error instanceof Anthropic.APIError)
        return `Anthropic API error ${error.status ?? ''} — ${error.message}`;
    return String(error);
}

/**
 * Translate text that may contain Wordplay markup, keeping the model away from
 * anything it shouldn't rewrite.
 *
 * `translateChunk` is the unprotected entry point — the splitting and masking
 * live in `translate()`, above it — so anything calling it directly hands the
 * model raw markup. Localizing an embedded example did exactly that, and a doc
 * whose text carries its own `\code\` came back with the code translated and
 * the backslashes gone, which fails `mismatchedDelimiter` and costs the entire
 * example. Only markup segments are sent; code is passed through untouched and
 * `@Concept` links are masked across the round trip.
 *
 * An element whose translation failed is returned unchanged, so a partial
 * failure costs a name or a sentence rather than a valid program.
 */
export async function translateProtectedMarkup(
    texts: string[],
    translateUnits: (units: string[]) => Promise<(string | null)[]>,
): Promise<string[]> {
    const segmented = texts.map(splitMarkupAndCode);
    const units: string[] = [];
    const unitLinks: string[][] = [];
    for (const segments of segmented)
        for (const segment of segments)
            if (segment.kind === 'markup' && segment.text.trim().length > 0) {
                const { masked, links } = protectConceptLinks(segment.text);
                units.push(masked);
                unitLinks.push(links);
            }
    if (units.length === 0) return texts;
    const out = await translateUnits(units);
    let unit = 0;
    return segmented.map((segments, index) => {
        let failed = false;
        const rebuilt = segments
            .map((segment) => {
                if (segment.kind === 'code' || segment.text.trim().length === 0)
                    return segment.text;
                const translated = out[unit];
                const links = unitLinks[unit] ?? [];
                unit++;
                if (translated === null || translated === undefined) {
                    failed = true;
                    return segment.text;
                }
                const restored = restoreConceptLinks(translated, links);
                // `splitMarkupAndCode` already took every `\…\` and `` `…` ``
                // out of this unit, so a delimiter in what came back is one the
                // model invented. Left in, it unbalances the rebuilt example and
                // the caller discards the whole thing; dropping just this unit
                // costs one sentence instead.
                if (mismatchedDelimiter(segment.text, restored))
                    return segment.text;
                return restored;
            })
            .join('');
        return failed ? texts[index] : rebuilt;
    });
}

export default class ClaudeTranslator implements Translator {
    readonly id = 'claude';

    // The SDK reads ANTHROPIC_API_KEY from the environment.
    private readonly client = new Anthropic({
        maxRetries: MaxRetries,
        timeout: RequestTimeout,
    });

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
     *  glossary + the locale's own conventions. Stable across all batches of a
     *  run (per source/target/glossary) so it caches. `targetText` supplies the
     *  target locale's translated glossary words so bare key terms localize, and
     *  its `guidance`/`terms`; omit it (e.g. before the glossary itself is
     *  translated) for the en-only glossary form and no conventions. */
    private buildSystem(
        sourceLocale: string,
        targetLocale: string,
        targetText: LocaleText | undefined,
        /** True when the strings being translated ARE the glossary terms. */
        translatingGlossary = false,
    ): string {
        // Empty for a locale that declares no conventions, so its prompt is
        // unchanged (and still cached) by this section existing.
        const conventions = getConventionsForPrompt(targetText);
        return `You are an expert localizer for Wordplay, a programming language for interactive typography. Translate each given string from ${sourceLocale} to ${targetLocale}.

Rules:
- Translate the natural-language text only. Preserve Wordplay markup exactly:
  - Keep every @Concept reference verbatim (e.g. @Phrase, @FunctionDefinition) — never translate, transliterate, or alter them.
  - Keep every $name reference verbatim (e.g. $value, $type) — never translate, transliterate, or alter them.
  - Do not add or remove formatting symbols (*, _, \`, backslashes).
${getPluralRulesForPrompt(targetLocale)}
- A blank line separates paragraphs. Keep the text organized into paragraphs — you may merge or re-break them where natural for the target language — but never insert a blank line anywhere except between paragraphs.
- Translate fully into the target language, written in its own native script. Do NOT leave words in English or merely transliterate them unless the language genuinely has no equivalent — prefer the native word a young learner of that language would recognize. This applies to ordinary text, names, and key terms alike (it does NOT apply to the @Concept and $name references above, which always stay verbatim).
- Write for young, multilingual learners.
- Key terms — the glossary below. When one of these words appears as ordinary text (a bare word, NOT a $name mention or @Concept link above), translate it to its listed target-language word and use that same word consistently. Where a line shows only an English word, translate it naturally and keep that choice consistent.
${getGlossaryForPrompt(targetText)}${
            translatingGlossary
                ? `
- The strings in THIS request are those glossary terms themselves, one word or phrase each. A bare word has no sentence around it to disambiguate it, so translate each in the sense its definition above gives — not the commonest sense of the English word. ("markup" is formatted text, not a price increase or a page margin.)`
                : ''
        }

${PLAIN_LANGUAGE_GUIDANCE}${conventions.length > 0 ? `\n\n${conventions}` : ''}`;
    }

    /** Translate one chunk of markup segments. Returns a same-length array; a
     *  `null` element means that string couldn't be translated (the caller marks
     *  it unwritten rather than shipping English). Results reconcile by the echoed
     *  `index`, so a miscount isolates to the missing items — one targeted retry
     *  of just those, then `null` — instead of failing (and re-splitting) the
     *  whole batch. `max_tokens` (a size problem) still splits the chunk; a
     *  `refusal` or wholly-unparseable reply (after one retry) nulls it. `isRetry`
     *  marks a recovery call so it doesn't itself recurse into more retries.
     *  Throws on a fatal error (caller aborts). */
    private async translateChunk(
        log: Log,
        chunk: string[],
        system: string,
        sourceLocale: string,
        targetLocale: string,
        model: string,
        isRetry = false,
    ): Promise<(string | null)[]> {
        const response = await this.client.messages.create({
            model,
            max_tokens: MAX_TOKENS,
            // The default model thinks adaptively when left alone, and on hard
            // scripts it spent more tokens reasoning about a routine chunk than
            // writing it (10k of 17k on one Kannada slice) — enough to erase
            // its price advantage over the repair model. Translation here is a
            // mechanical transform whose failures are caught by validators and
            // escalated, so the bulk path turns thinking off; the repair model
            // keeps its default, since it gets exactly the strings that needed
            // more than mechanics.
            ...(model === REPAIR_MODEL
                ? {}
                : { thinking: { type: 'disabled' } }),
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
                    // The source/target pair and the response shape are already
                    // in the cached system block and the enforced output schema;
                    // repeating them here would just bill again on every request.
                    // The index-echo ask is the one semantic the schema can't
                    // express.
                    content: `Translate these ${chunk.length} strings, echoing each input's "index".\n\n${JSON.stringify(chunk.map((text, index) => ({ index, text })))}`,
                },
            ],
        });
        this.recordUsage(model, response.usage);

        if (response.stop_reason === 'refusal') {
            log.warning('Claude refused a chunk; marking it unwritten.');
            return chunk.map(() => null);
        }
        if (response.stop_reason === 'max_tokens') {
            // Output overflowed the cap — a size problem (big atomic docs). Split
            // the batch so it fits; a single string that still overflows is null.
            if (chunk.length <= 1) {
                log.warning(
                    'Claude truncated a single string; marking it unwritten.',
                );
                return [null];
            }
            const mid = Math.ceil(chunk.length / 2);
            log.warning(
                `Claude response truncated; retrying in halves (${chunk.length} → ${mid}+${chunk.length - mid}).`,
            );
            return [
                ...(await this.translateChunk(
                    log,
                    chunk.slice(0, mid),
                    system,
                    sourceLocale,
                    targetLocale,
                    model,
                )),
                ...(await this.translateChunk(
                    log,
                    chunk.slice(mid),
                    system,
                    sourceLocale,
                    targetLocale,
                    model,
                )),
            ];
        }

        const textBlock = response.content.find((b) => b.type === 'text');
        const reconciled =
            textBlock !== undefined
                ? reconcileTranslations(textBlock.text, chunk.length)
                : undefined;

        // Wholly unparseable (bad JSON / wrong outer shape): retry once, else null.
        if (reconciled === undefined) {
            if (!isRetry)
                return this.translateChunk(
                    log,
                    chunk,
                    system,
                    sourceLocale,
                    targetLocale,
                    model,
                    true,
                );
            log.warning(
                'Claude response was unparseable after a retry; marking it unwritten.',
            );
            return chunk.map(() => null);
        }

        // Reconciled by index. Fill any items the model dropped with a single
        // targeted retry of just those; whatever is still missing stays null.
        const missing = reconciled.flatMap((t, i) => (t === null ? [i] : []));
        if (missing.length === 0) return reconciled;
        if (isRetry) {
            log.warning(
                `${missing.length}/${chunk.length} items still missing after retry; marking them unwritten.`,
            );
            return reconciled;
        }
        log.warning(
            `${missing.length}/${chunk.length} items missing from the response; retrying just those.`,
        );
        const filled = await this.translateChunk(
            log,
            missing.map((i) => chunk[i]),
            system,
            sourceLocale,
            targetLocale,
            model,
            true,
        );
        missing.forEach((originalIndex, k) => {
            reconciled[originalIndex] = filled[k];
        });
        return reconciled;
    }

    /** Tokens consumed so far, per model, accumulated from every response. */
    private readonly usageByModel = new Map<
        string,
        Omit<TranslatorUsage, 'model' | 'cost'>
    >();

    /** Accumulate one response's usage so the run can report tokens and cost. */
    private recordUsage(
        model: string,
        usage: Anthropic.Messages.Usage | undefined,
    ): void {
        if (usage === undefined) return;
        const total = this.usageByModel.get(model) ?? {
            requests: 0,
            inputTokens: 0,
            outputTokens: 0,
            cacheReadTokens: 0,
            cacheWriteTokens: 0,
            thinkingTokens: 0,
        };
        total.requests += 1;
        total.inputTokens += usage.input_tokens;
        total.outputTokens += usage.output_tokens;
        total.cacheReadTokens += usage.cache_read_input_tokens ?? 0;
        total.cacheWriteTokens += usage.cache_creation_input_tokens ?? 0;
        total.thinkingTokens +=
            usage.output_tokens_details?.thinking_tokens ?? 0;
        this.usageByModel.set(model, total);
    }

    getUsage(): TranslatorUsage[] {
        return [...this.usageByModel.entries()].map(([model, usage]) => ({
            model,
            ...usage,
            cost: estimateCost({ model, ...usage }),
        }));
    }

    /**
     * Translate units in bounded chunks, deduplicating identical units so
     * repeated boilerplate is paid for once. Returns results aligned 1:1 with
     * `units` plus how many chunks failed outright; a failed chunk leaves its
     * own units null and the rest stand, so a re-run picks up only what's
     * missing rather than losing eight good chunks because the ninth timed out.
     */
    private async translateUnitsInChunks(
        log: Log,
        units: string[],
        system: string,
        sourceLocale: string,
        targetLocale: string,
        model: string,
    ): Promise<{ results: (string | null)[]; failures: number }> {
        let failures = 0;
        const results = await translateDeduped(units, async (unique) => {
            if (units.length > unique.length)
                log.say(
                    `Reusing translations for ${units.length - unique.length} duplicate segments`,
                );
            // Reuse anything this run already translated under the same system
            // prompt and model. `translateDeduped` only dedupes within a single
            // call, and the bulk phase is now sliced into several so it can
            // checkpoint — without this, every duplicate straddling a slice
            // boundary would be bought twice. It also spans the locale file,
            // both tutorials, and the how-tos, which were separate calls before.
            const keyOf = (unit: string) =>
                `${this.systemId(system)}\u0000${model}\u0000${unit}`;
            const remembered = unique.filter((unit) =>
                this.translationMemo.has(keyOf(unit)),
            ).length;
            if (remembered > 0)
                log.say(
                    `Reusing ${remembered} segments already translated in this run`,
                );
            return translateMemoized(
                unique,
                this.translationMemo,
                keyOf,
                async (pending) => {
                    const translated: (string | null)[] = [];
                    let done = 0;
                    // A phase can be thousands of segments, and without per-chunk
                    // reporting the run is silent between chunks — indistinguishable
                    // from being stuck, and read as exactly that.
                    for (const chunk of chunkUnits(pending)) {
                        const characters = chunk.reduce(
                            (total, unit) => total + unit.length,
                            0,
                        );
                        done += chunk.length;
                        const started = Date.now();
                        const elapsed = () =>
                            ((Date.now() - started) / 1000).toFixed(1);
                        try {
                            translated.push(
                                ...(await this.translateChunk(
                                    log,
                                    chunk,
                                    system,
                                    sourceLocale,
                                    targetLocale,
                                    model,
                                )),
                            );
                            log.say(
                                `${done}/${pending.length} text segments, ${characters} chars in ${elapsed()}s`,
                            );
                        } catch (error) {
                            failures++;
                            translated.push(...chunk.map(() => null));
                            // A failed chunk is a sibling of the successes around it,
                            // not a level above them — one outcome of the same loop.
                            log.bad(
                                `Chunk of ${chunk.length} segments (${characters} chars) failed after ${elapsed()}s: ${describeClaudeError(error)}`,
                            );
                        }
                    }
                    return translated;
                },
            );
        });
        return { results, failures };
    }

    /**
     * Translations this instance has already produced, keyed by the system
     * prompt and model that produced them plus the source string. The system
     * prompt is what makes reuse exactly safe: it already encodes the source and
     * target locales, whether the strings are glossary terms, and the target's
     * glossary and conventions, so an identical key means an identical request.
     * The model is separate because it is chosen by `options.names` rather than
     * baked into the prompt.
     */
    private readonly translationMemo = new Map<string, string>();

    /** Short ids for system prompts, so the memo's keys don't each carry a copy
     *  of a ~6KB prompt. */
    private readonly systemIds = new Map<string, number>();
    private systemId(system: string): number {
        let id = this.systemIds.get(system);
        if (id === undefined) {
            id = this.systemIds.size;
            this.systemIds.set(system, id);
        }
        return id;
    }

    /** Cache of loaded target locale texts, used to localize embedded examples'
     *  standard-library references to the locale's names. */
    private readonly localeTextCache = new Map<
        string,
        LocaleText | undefined
    >();

    /**
     * Localized examples this instance has already produced, keyed by locale
     * pair and source code. One translator serves a whole locale run (locale
     * file, both tutorials, every how-to), so an example that appears in more
     * than one file is localized once. Safe to reuse across calls because the
     * caller writes the locale file (the names examples retarget against)
     * before the tutorial and how-to passes read it.
     */
    private readonly exampleCache = new Map<string, string>();

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
        return Array.from(project.analyze().conflictedNodes.values()).flat()
            .length;
    }

    /**
     * Strip an example's `\…\` delimiters to recover the program source, or
     * return undefined when there is nothing to localize: an empty program, or
     * one with no letter in any script — e.g. the text-delimiter demos
     * `""`/`“”`/`«»`/`「」` or pure number/symbol programs. Sending those to the
     * model risks normalizing the very delimiters they demonstrate (`“”` → `''`),
     * so they stay verbatim.
     */
    private prepareExample(
        code: string,
    ): { inner: string; terminated: boolean } | undefined {
        let inner = code;
        let terminated = false;
        if (inner.startsWith('\\')) inner = inner.slice(1);
        if (inner.endsWith('\\')) {
            inner = inner.slice(0, -1);
            terminated = true;
        }
        if (inner.trim().length === 0) return undefined;
        if (!/\p{L}/u.test(inner)) return undefined;
        return { inner, terminated };
    }

    /**
     * The gather half of example localization: parse the example and record the
     * texts `translateProjectContent` would ask a translator for — names, docs,
     * text literals — without sending anything. Extraction is deterministic, so
     * a later `localizeExample` with a lookup translator asks for exactly these
     * strings; pooling the union across all of a file's examples into shared
     * bounded chunks is what turned ~900 one-example requests per locale into a
     * few dozen.
     */
    private async collectExampleTexts(
        code: string,
        sourceLocale: string,
        targetLocale: string,
        targetLocaleText: LocaleText | undefined,
    ): Promise<string[]> {
        const sourceObj = stringToLocale(sourceLocale);
        const targetObj = stringToLocale(targetLocale);
        if (sourceObj === undefined || targetObj === undefined) return [];
        const prepared = this.prepareExample(code);
        if (prepared === undefined) return [];
        const texts: string[] = [];
        try {
            const project = Project.make(
                null,
                'example',
                new Source('start', prepared.inner),
                [],
                DefaultLocale,
            );
            // Returning null aborts translateProjectContent right after the
            // texts are requested, so the gather pass costs parsing, not tree
            // rewriting.
            await translateProjectContent(
                project,
                sourceObj,
                targetObj,
                (requested) => {
                    texts.push(...requested);
                    return Promise.resolve(null);
                },
                targetLocaleText,
                true,
            );
        } catch {
            // Best-effort: an example that fails to parse here also fails in
            // localizeExample, which keeps the original.
        }
        return texts;
    }

    /**
     * Localize one embedded `\code\` example so it reads in the target language:
     * names (and their references), text literals, and docs are replaced, and
     * standard-library references use the target locale's names. The original is
     * kept verbatim if anything fails or if localization introduces new
     * conflicts (the "re-serialize, re-analyze conflict-free" guarantee).
     * Every one of those exits says why: four of them used to return in
     * silence, so a run could report an example localized while quietly
     * keeping the English, and the only way to notice was to read the file.
     * `translateTexts` supplies the translations — a pooled lookup in the batch
     * path, a direct per-example request in `localizeOneExample`.
     */
    private async localizeExample(
        log: Log,
        code: string,
        sourceLocale: string,
        targetLocale: string,
        targetLocaleText: LocaleText | undefined,
        translateTexts: RawTranslator,
    ): Promise<string> {
        const sourceObj = stringToLocale(sourceLocale);
        const targetObj = stringToLocale(targetLocale);
        if (sourceObj === undefined || targetObj === undefined) {
            log.warning(
                `Could not read "${sourceObj === undefined ? sourceLocale : targetLocale}" as a locale; keeping the original example.`,
            );
            return code;
        }

        const prepared = this.prepareExample(code);
        if (prepared === undefined) {
            log.warning(
                'Could not read the example out of its delimiters; keeping the original.',
            );
            return code;
        }
        const { inner, terminated } = prepared;

        try {
            const project = Project.make(
                null,
                'example',
                new Source('start', inner),
                [],
                DefaultLocale,
            );
            const baseline = this.countConflicts(project);

            const localized = await translateProjectContent(
                project,
                sourceObj,
                targetObj,
                translateTexts,
                targetLocaleText,
                true,
            );
            if (localized === null) {
                log.warning(
                    'Localizing the example returned nothing; keeping the original.',
                );
                return code;
            }

            const newInner = localized.getSources()[0]?.toWordplay();
            if (newInner === undefined) {
                log.warning(
                    'Localized example had no source to serialize; keeping the original.',
                );
                return code;
            }

            // A nested example (e.g. a formatted `…` literal containing `\code\`)
            // can come back from the model with a doubled/orphaned delimiter. That
            // re-parses conflict-free in isolation but breaks the doc it's embedded
            // in, so the conflict check below misses it — compare delimiter counts
            // to the source and keep the original example if they differ.
            if (mismatchedDelimiter(inner, newInner) !== undefined) {
                log.warning(
                    'Localized example left an unbalanced delimiter; keeping the original.',
                );
                return code;
            }

            // An identifier the model localized may have picked up a string
            // delimiter (e.g. a transliteration apostrophe written as `'`), leaving
            // an unterminated text literal that swallows the rest of the embedding
            // doc. It doesn't change the `\`/`` ` `` counts above and may not raise
            // the conflict count on a 🪲 example, so check text-literal balance
            // directly and keep the source if localization introduced an open one.
            if (!hasUnclosedText(inner) && hasUnclosedText(newInner)) {
                log.warning(
                    'Localized example left an unterminated text literal; keeping the original.',
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
                    'Localized example introduced conflicts; keeping the original.',
                );
                return code;
            }

            return terminated ? `\\${newInner}\\` : `\\${newInner}`;
        } catch (error) {
            log.warning(
                `Could not localize embedded example; keeping the original: ${String(error)}`,
            );
            return code;
        }
    }

    /**
     * Localize a single `\code\` example surgically — builds the system prompt and loads the
     * target locale text itself. For one-off scripts that localize specific examples (e.g. English
     * examples substituted into a locale) without running a full doc translation. Keeps the
     * original verbatim on any failure or if localization would introduce conflicts.
     */
    async localizeOneExample(
        log: Log,
        code: string,
        sourceLocale: string,
        targetLocale: string,
    ): Promise<string> {
        const targetLocaleText = this.loadLocaleText(log, targetLocale);
        const system = this.buildSystem(
            sourceLocale,
            targetLocale,
            targetLocaleText,
        );
        // One-off use, so a direct per-example request rather than the pooled
        // path `translate()` takes.
        const direct: RawTranslator = async (texts) => {
            if (texts.length === 0) return [];
            try {
                return await translateProtectedMarkup(texts, async (units) =>
                    this.translateChunk(
                        log,
                        units,
                        system,
                        sourceLocale,
                        targetLocale,
                        DEFAULT_MODEL,
                    ),
                );
            } catch {
                return null;
            }
        };
        return this.localizeExample(
            log,
            code,
            sourceLocale,
            targetLocale,
            targetLocaleText,
            direct,
        );
    }

    async translate(
        parentLog: Log,
        text: string[],
        sourceLocale: string,
        targetLocale: string,
        targetText?: LocaleText,
        options?: { names?: boolean; glossary?: boolean },
    ): Promise<(string | null)[] | undefined> {
        // Everything this call reports — chunk progress, refusals, the final
        // count — belongs to one translation, so group it under the pair being
        // translated rather than scattering it beside the caller's own lines.
        const log = parentLog.scope(`${sourceLocale} → ${targetLocale}`);

        // Identifier names go to the stronger model: they are a tiny fraction
        // of a run's tokens, and a bad one is a cross-locale name collision.
        const model = options?.names === true ? REPAIR_MODEL : DEFAULT_MODEL;

        // Split each string into markup and code segments. Markup is translated
        // as text; `\code\` (embedded Wordplay programs) is localized separately
        // below so each reads natively while staying a valid, conflict-free program.
        const allSegments = text.map((s) => splitMarkupAndCode(s));

        // Collect the non-empty markup segments to translate, remembering where
        // each came from so we can reassemble.
        const units: string[] = [];
        const unitLocations: Array<{ string: number; segment: number }> = [];
        // The links masked out of each unit, so they can go back afterwards.
        const unitLinks: string[][] = [];
        allSegments.forEach((segments, stringIndex) =>
            segments.forEach((seg, segmentIndex) => {
                if (seg.kind === 'markup' && seg.text.trim().length > 0) {
                    // Mask `@Concept` links before the model ever sees them.
                    // The system prompt asks for them verbatim and is ignored;
                    // this is the same move `splitMarkupAndCode` makes for code.
                    const { masked, links } = protectConceptLinks(seg.text);
                    units.push(masked);
                    unitLinks.push(links);
                    unitLocations.push({
                        string: stringIndex,
                        segment: segmentIndex,
                    });
                }
            }),
        );

        const system = this.buildSystem(
            sourceLocale,
            targetLocale,
            targetText,
            options?.glossary === true,
        );

        // Translate units in bounded, deduplicated chunks. A chunk that fails
        // leaves its own segments null and the rest stand: the caller keeps a
        // null segment's source unwritten, so a re-run picks up only what's
        // missing. Losing eight good chunks because the ninth timed out is a
        // worse trade than a locale that finishes in two passes.
        const { results: translatedUnits, failures } =
            await this.translateUnitsInChunks(
                log,
                units,
                system,
                sourceLocale,
                targetLocale,
                model,
            );

        // Nothing landed at all: the caller's "check your credentials" advice
        // is worth giving here, and only here.
        if (failures > 0 && translatedUnits.every((unit) => unit === null))
            return undefined;
        if (failures > 0)
            log.warning(
                `Translated ${translatedUnits.filter((unit) => unit !== null).length} of ${units.length} segments; the rest stay unwritten — re-run to finish them.`,
            );

        // Localize each unique embedded `\code\` example so it reads natively in
        // the target language (names/text/docs replaced, references retargeted).
        // Done once per example per locale pair — the instance-level cache means
        // an example the locale file already localized isn't re-done for the
        // tutorial or a how-to. Failures fall back to verbatim.
        const targetLocaleText =
            targetText ?? this.loadLocaleText(log, targetLocale);
        const uniqueCodes = [
            ...new Set(
                allSegments.flatMap((segments) =>
                    segments
                        .filter((seg) => seg.kind === 'code')
                        .map((seg) => seg.text),
                ),
            ),
        ];
        const exampleKey = (code: string) =>
            `${sourceLocale}→${targetLocale}\n${code}`;
        const pending = uniqueCodes.filter(
            (code) => !this.exampleCache.has(exampleKey(code)),
        );
        if (pending.length > 0) {
            const examples = log.pending(
                `Localizing ${pending.length} embedded examples`,
            );
            // Gather pass: extract every example's translatable texts locally,
            // with no API calls.
            const textsByCode = new Map<string, string[]>();
            for (const code of pending)
                textsByCode.set(
                    code,
                    await this.collectExampleTexts(
                        code,
                        sourceLocale,
                        targetLocale,
                        targetLocaleText,
                    ),
                );
            // Translate the union once, in shared bounded chunks, instead of
            // one request per example — the per-example requests were a few
            // short identifiers each riding a full system prompt, and were
            // most of a run's input tokens.
            const allTexts = [...new Set([...textsByCode.values()].flat())];
            const translatedByText = new Map<string, string>();
            if (allTexts.length > 0) {
                const translated = await translateProtectedMarkup(
                    allTexts,
                    async (chunkedUnits) =>
                        (
                            await this.translateUnitsInChunks(
                                examples,
                                chunkedUnits,
                                system,
                                sourceLocale,
                                targetLocale,
                                model,
                            )
                        ).results,
                );
                allTexts.forEach((original, index) =>
                    translatedByText.set(original, translated[index]),
                );
            }
            // Apply pass: localize each example against the pooled results. A
            // text the pool couldn't translate resolves to itself, which is
            // the same keep-the-source outcome the per-example path had.
            // A text the pool can't answer resolves to itself, which localizes
            // the example to exactly what it already was: no bail, no warning,
            // and a run that reports it localized while the English stays. Say
            // so instead — a miss means gather and apply disagreed about what
            // this example's texts are, which is a defect, not a translation
            // that happened to come back the same.
            let missed = 0;
            const lookup: RawTranslator = (requested) =>
                Promise.resolve(
                    requested.map((original) => {
                        const found = translatedByText.get(original);
                        if (found === undefined) {
                            missed++;
                            examples.warning(
                                `The pooled translations have nothing for "${original.slice(0, 40)}"; the example keeps it.`,
                            );
                        }
                        return found ?? original;
                    }),
                );
            let applied = 0;
            for (const code of pending) {
                this.exampleCache.set(
                    exampleKey(code),
                    await this.localizeExample(
                        examples,
                        code,
                        sourceLocale,
                        targetLocale,
                        targetLocaleText,
                        lookup,
                    ),
                );
                applied++;
                if (applied % 25 === 0 || applied === pending.length)
                    examples.say(
                        `${applied}/${pending.length} examples localized`,
                    );
            }
            if (missed > 0)
                examples.warning(
                    `${missed} text(s) had no pooled translation, so the examples holding them were localized to themselves.`,
                );
        }
        const codeMap = new Map<string, string>(
            uniqueCodes.map((code) => [
                code,
                this.exampleCache.get(exampleKey(code)) ?? code,
            ]),
        );

        // How many plural forms this locale distinguishes — one for Japanese,
        // six for Arabic. What a translation's `$#name` branches are measured
        // against, since English's two say nothing about what it needs.
        const pluralForms = getPluralCount(targetLocale);

        // Reassemble one string from its translated units, validating it. A
        // `null` means the translation is unusable and the caller keeps the
        // source unwritten rather than shipping something broken.
        const reassemble = (
            segments: { kind: 'markup' | 'code'; text: string }[],
            source: string,
            unitsFor: (string | null)[],
            linksFor: string[][],
            quiet: boolean,
        ): string | null => {
            let failed = false;
            let index = 0;
            const rebuilt = segments
                .map((seg) => {
                    if (seg.kind === 'code')
                        return codeMap.get(seg.text) ?? seg.text;
                    if (seg.text.trim().length === 0) return seg.text;
                    const at = index++;
                    const unit = unitsFor[at];
                    if (unit === null) failed = true;
                    // Put the masked links back where the translation left
                    // their placeholders — which may not be where they
                    // started, since grammar reorders sentences.
                    return unit === null || unit === undefined
                        ? ''
                        : restoreConceptLinks(unit, linksFor[at] ?? []);
                })
                .join('');
            // A markup unit couldn't be translated → signal null so the caller
            // keeps the source unwritten ($?) rather than shipping English.
            if (failed) return null;
            // Safety belt (cross-backend repair): restore mangled @Concept
            // links and $name mentions. If the `\…\`/`` `…` `` delimiters no
            // longer match the source, the string would break tokenization —
            // signal null instead of shipping a corrupt (or English) string.
            const repaired = repairMentionsPositional(
                source,
                restoreReferences(source, rebuilt, ConceptPattern),
            );
            const complain = (message: string) => {
                if (!quiet) log.warning(message);
                return null;
            };
            if (mismatchedDelimiter(source, repaired) !== undefined)
                return complain(
                    `A translation left an unbalanced delimiter; marking it unwritten (${targetLocale}).`,
                );
            // Masking should mean the links came back untouched. If one is
            // renamed or missing anyway — a dropped placeholder, or a link
            // the model invented — the string would render as the
            // unknown-character glyph, so keep the source unwritten and let
            // a re-run retry it. This is what makes "the translator can't
            // break links" true rather than merely likely (#1263).
            const link = mismatchedConceptLinks(source, repaired);
            if (link !== undefined) {
                // Say which way it went. "Altered" covers dropped, duplicated,
                // and invented, and those need different fixes — without the
                // counts every report looks the same and the only way to tell
                // is to re-run with a debugger attached.
                const occurrences = (text: string) =>
                    Array.from(text.matchAll(ConceptPattern)).filter(
                        ([match]) => match === link,
                    ).length;
                return complain(
                    `A translation altered the concept link ${link} (${occurrences(source)} in the source, ${occurrences(repaired)} in the translation); marking it unwritten (${targetLocale}).`,
                );
            }
            // A placeholder that outlived restoration means the restore
            // silently failed, and `mismatchedConceptLinks` can't always
            // see it: when the source carries no links of its own, source
            // and translation both count zero and the raw `⟦0⟧` sails
            // through into the locale file. Seven did.
            if (hasResidualLinkMask(repaired))
                return complain(
                    `A translation kept a link placeholder instead of the link; marking it unwritten (${targetLocale}).`,
                );
            // A dropped `$#name` leaves the arms behind as a literal bracket
            // group, which a screen reader reads out bars and all. Nothing above
            // catches it: the arms repeat the other inputs, so the mention
            // counts don't line up and positional repair declines to guess.
            // Locales with the most forms are where it happens — ar-SA lost it
            // twice while the other 28 kept it — which is exactly the case the
            // per-string retry on the repair model is for.
            const plural = mismatchedPluralBranch(
                source,
                repaired,
                pluralForms,
            );
            if (plural !== undefined)
                return complain(
                    `A translation dropped the plural forms of $${plural}; marking it unwritten (${targetLocale}).`,
                );
            return repaired;
        };

        // Reassemble each string: translated markup in place, localized code.
        let unitIndex = 0;
        const unitRange: { start: number; count: number }[] = [];
        const result: (string | null)[] = allSegments.map(
            (segments, stringIndex) => {
                const start = unitIndex;
                const count = segments.filter(
                    (seg) =>
                        seg.kind === 'markup' && seg.text.trim().length > 0,
                ).length;
                unitIndex += count;
                unitRange.push({ start, count });
                return reassemble(
                    segments,
                    text[stringIndex],
                    translatedUnits.slice(start, start + count),
                    unitLinks.slice(start, start + count),
                    // Stay quiet on the first attempt: a retry may well fix it,
                    // and warning twice about one string reads as two problems.
                    true,
                );
            },
        );

        // Retry the strings that came back unusable, one string per request.
        //
        // Every rejection above is the model losing track of a `⟦n⟧` placeholder
        // or a delimiter, and it does that far more readily in a 25-segment
        // request than in one holding a single string. Retrying only the
        // failures costs a handful of small requests and recovers most of them;
        // without it the same strings fail every run forever, which is exactly
        // where 42 of them ended up.
        const retryable = result
            .map((value, index) => ({ value, index }))
            .filter(
                ({ value, index }) =>
                    value === null && unitRange[index].count > 0,
            );

        // A string whose every segment is code — a lone `\…\` example, which is
        // what a landing-page caption is — has no units to retry, so it is
        // rightly left out above. But the first pass stayed quiet *because* a
        // retry was coming, so leaving it out is what made it fail in silence:
        // the run reported the example localized and kept the English, and the
        // only way to notice was to read the file. Say it now instead. The
        // second call is only for its complaint; its result is discarded.
        for (const { index } of result
            .map((value, index) => ({ value, index }))
            .filter(
                ({ value, index }) =>
                    value === null && unitRange[index].count === 0,
            ))
            reassemble(allSegments[index], text[index], [], [], false);
        if (retryable.length > 0) {
            const retryLog = log.pending(
                `Retrying ${retryable.length} string(s) the model garbled, one at a time`,
            );
            let recovered = 0;
            for (const { index } of retryable) {
                const { start, count } = unitRange[index];
                const segments = allSegments[index];
                const links = unitLinks.slice(start, start + count);
                let units: (string | null)[];
                try {
                    units = await this.translateChunk(
                        log,
                        // Re-mask from the source so the retry is independent of
                        // whatever the first attempt did to the placeholders.
                        segments
                            .filter(
                                (seg) =>
                                    seg.kind === 'markup' &&
                                    seg.text.trim().length > 0,
                            )
                            .map((seg) => protectConceptLinks(seg.text).masked),
                        system,
                        sourceLocale,
                        targetLocale,
                        // The default model already lost track of this string
                        // once; give the retry to the stronger model. These are
                        // a handful of single-string requests per locale, so
                        // the quality costs pennies.
                        REPAIR_MODEL,
                    );
                } catch {
                    continue;
                }
                const second = reassemble(
                    segments,
                    text[index],
                    units,
                    links,
                    false,
                );
                if (second !== null) {
                    result[index] = second;
                    recovered++;
                }
            }
            retryLog.good(
                `Recovered ${recovered} of ${retryable.length} on retry.`,
            );
        }

        log.good(`Translated ${text.length} strings with Claude.`);
        return result;
    }
}
