import Anthropic from '@anthropic-ai/sdk';
import type { CallableRequest } from 'firebase-functions/v2/https';
import type {
    AnalyzeLocalizationInputs,
    AnalyzeLocalizationOutput,
    GlossaryWord,
    LiteralTermFinding,
    StringAnalysis,
} from 'shared-types';
import { PLAIN_LANGUAGE_GUIDANCE } from './shared/readingLevel.js';

const MODEL = 'claude-opus-4-8';
const MAX_TOKENS = 16000;
/** Strings per request, to bound tokens on large bundles. */
const CHUNK_SIZE = 40;

const SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        results: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    complex: { type: 'boolean' },
                    readingLevelNote: { type: 'string' },
                    literalTerms: {
                        type: 'array',
                        items: {
                            type: 'object',
                            additionalProperties: false,
                            properties: {
                                term: { type: 'string' },
                                id: { type: 'string' },
                            },
                            required: ['term', 'id'],
                        },
                    },
                    backTranslation: { type: 'string' },
                },
                required: [
                    'complex',
                    'readingLevelNote',
                    'literalTerms',
                    'backTranslation',
                ],
            },
        },
    },
    required: ['results'],
};

type RawTerm = { term: string; id: string };
type RawResult = {
    complex: boolean;
    readingLevelNote: string;
    literalTerms: RawTerm[];
    backTranslation: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isRawTerm(value: unknown): value is RawTerm {
    return (
        isRecord(value) &&
        typeof value.term === 'string' &&
        typeof value.id === 'string'
    );
}

function isRawResult(value: unknown): value is RawResult {
    return (
        isRecord(value) &&
        typeof value.complex === 'boolean' &&
        typeof value.readingLevelNote === 'string' &&
        typeof value.backTranslation === 'string' &&
        Array.isArray(value.literalTerms) &&
        value.literalTerms.every(isRawTerm)
    );
}

/** Parse the structured output, returning the results only when it's an array
 *  of the expected length and shape (so the caller degrades gracefully). */
function parse(text: string, expected: number): RawResult[] | null {
    let data: unknown;
    try {
        data = JSON.parse(text);
    } catch {
        return null;
    }
    if (!isRecord(data) || !Array.isArray(data.results)) return null;
    const results = data.results;
    if (results.length !== expected) return null;
    return results.every(isRawResult) ? results : null;
}

/** Replace the first whole-word occurrence of `term` with `$id` so the PR can
 *  show a concrete symbolization suggestion. Falls back to the original text. */
function buildSuggestion(text: string, term: string, id: string): string {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(
        `(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`,
        'u',
    );
    return text.replace(re, '$' + id);
}

function buildSystem(
    locale: string,
    sourceLocale: string,
    glossary: GlossaryWord[],
    backTranslate: boolean,
): string {
    const glossaryList =
        glossary.length > 0
            ? `\n\nGlossary terms (id — word). A term is "literal" when its word appears as plain prose AND genuinely refers to this concept (not an unrelated everyday use); it should instead be a symbolic $id reference:\n${glossary
                  .map((g) => `- ${g.id} — ${g.word}`)
                  .join('\n')}`
            : '';
    return `You are a localization quality reviewer for Wordplay, a programming language for young, multilingual learners. The strings under review are in ${locale}.

For each string, return:
- "complex": true if the text requires reading ability beyond a lower-secondary level — i.e., it breaks any of the plain-language principles below; false if it follows them.
- "readingLevelNote": one short English sentence naming the specific issue (e.g. a long sentence with several ideas, an unusual or undefined word, more than one topic in a paragraph, an unexplained abbreviation, passive voice, or an idiom/metaphor) and how to simplify it; "" when the text follows the principles.
- "literalTerms": each genuine literal glossary term as { "term": <the word as it appears>, "id": <glossary id> }; [] if none.
${backTranslate ? `- "backTranslation": a faithful, natural ${sourceLocale} translation of the string, for reviewers who don't read ${locale}.` : `- "backTranslation": "".`}

Do not rewrite or change the strings; only assess them.

${PLAIN_LANGUAGE_GUIDANCE}${glossaryList}

Return JSON {"results":[...]} with exactly one entry per input string, in the same order.`;
}

/**
 * Analyze locale strings for reading level (#460) and glossary symbolization,
 * optionally back-translating. Shared by the `analyzeLocalization` callable
 * (in-app) and `submitLocalization` (PR review). Returns one analysis per
 * input string, or null on any failure (graceful degrade is the contract).
 */
export async function analyze(
    input: AnalyzeLocalizationInputs,
): Promise<AnalyzeLocalizationOutput> {
    const { locale, sourceLocale, strings, glossary, backTranslate } = input;
    if (!Array.isArray(strings) || strings.length === 0) return [];

    try {
        const client = new Anthropic();
        const system = buildSystem(
            locale,
            sourceLocale,
            glossary,
            backTranslate,
        );
        const out: StringAnalysis[] = [];

        for (let i = 0; i < strings.length; i += CHUNK_SIZE) {
            const chunk = strings.slice(i, i + CHUNK_SIZE);
            const response = await client.messages.create({
                model: MODEL,
                max_tokens: MAX_TOKENS,
                system: [
                    {
                        type: 'text',
                        text: system,
                        cache_control: { type: 'ephemeral' },
                    },
                ],
                output_config: {
                    format: { type: 'json_schema', schema: SCHEMA },
                },
                messages: [
                    {
                        role: 'user',
                        content: `Analyze these ${chunk.length} strings. Return JSON {"results":[...]} with exactly ${chunk.length} entries, in order.\n\n${JSON.stringify(
                            chunk.map((s) => s.text),
                        )}`,
                    },
                ],
            });

            if (
                response.stop_reason === 'refusal' ||
                response.stop_reason === 'max_tokens'
            )
                return null;

            const block = response.content.find((b) => b.type === 'text');
            const parsed =
                block !== undefined ? parse(block.text, chunk.length) : null;
            if (parsed === null) return null;

            parsed.forEach((r, j) => {
                const literalTerms: LiteralTermFinding[] = r.literalTerms.map(
                    (t) => ({
                        term: t.term,
                        id: t.id,
                        suggestion: buildSuggestion(
                            chunk[j].text,
                            t.term,
                            t.id,
                        ),
                    }),
                );
                out.push({
                    key: chunk[j].key,
                    complex: r.complex,
                    readingLevelNote: r.readingLevelNote,
                    literalTerms,
                    ...(backTranslate
                        ? { backTranslation: r.backTranslation }
                        : {}),
                });
            });
        }

        return out;
    } catch (e) {
        console.error(e);
        return null;
    }
}

/** Callable wrapper for the in-app reading-level check. Requires the
 *  ANTHROPIC_API_KEY secret bound to the function. */
export default async function analyzeLocalization(
    request: CallableRequest<AnalyzeLocalizationInputs>,
): Promise<AnalyzeLocalizationOutput> {
    return analyze(request.data);
}
