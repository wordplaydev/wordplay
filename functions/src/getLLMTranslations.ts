import Anthropic from '@anthropic-ai/sdk';
import { HttpsError } from 'firebase-functions/v2/https';
import type { CallableRequest } from 'firebase-functions/v2/https';
import type { GetLLMTranslationsInputs } from 'shared-types';
import { PLAIN_LANGUAGE_GUIDANCE } from './shared/readingLevel.js';
import {
    charge,
    costOf,
    MAX_CHARACTERS_PER_CALL,
    MAX_TEXTS_PER_CALL,
    refund,
} from './translationBudget.js';

/**
 * The bulk translation model, mirroring the locale tooling's split: the cheap
 * model carries the volume and the validators downstream (the JSON schema and
 * `parse` below, and the client's delimiter and conflict guards) are what make
 * it safe. Thinking is off for the same reason it is off there — left adaptive,
 * the model spends most of its output budget reasoning about routine prose and
 * gives back the price advantage entirely.
 */
const MODEL = 'claude-sonnet-5';
const MAX_TOKENS = 16000;

const SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        translations: { type: 'array', items: { type: 'string' } },
    },
    required: ['translations'],
};

function hasTranslations(data: unknown): data is { translations: unknown } {
    return typeof data === 'object' && data !== null && 'translations' in data;
}

/** Parse and validate the structured output; null unless it's a string array of
 *  the expected length (so the client keeps the source on any anomaly). */
function parse(text: string, expected: number): string[] | null {
    let data: unknown;
    try {
        data = JSON.parse(text);
    } catch {
        return null;
    }
    if (!hasTranslations(data)) return null;
    const translations = data.translations;
    if (!Array.isArray(translations)) return null;
    if (!translations.every((t): t is string => typeof t === 'string'))
        return null;
    return translations.length === expected ? translations : null;
}

function buildSystem(
    from: string,
    to: string,
    context: GetLLMTranslationsInputs['projectContext'],
): string {
    const names = context?.names?.length
        ? `\nOther names in this project (for domain context — do not translate these, just use them to choose fitting words): ${context.names.join(', ')}`
        : '';
    const docs = context?.docs?.length
        ? `\nWhat this project is about: ${context.docs.join(' ').slice(0, 800)}`
        : '';
    return `You are translating the contents of a Wordplay creative coding project from ${from} to ${to}.

Rules:
- Translate the natural-language text only. Preserve Wordplay markup exactly: keep every @Concept reference, every $name reference, and every \\code\\ block verbatim — never translate or alter them.
- A short standalone word is a code name; translate it to a fitting single word in the target language (the app converts it to a valid identifier).
- Keep blank lines (paragraph breaks) between paragraphs, and keep words separated by a space; within a paragraph you may reflow text.
- Write for young, multilingual learners.

${PLAIN_LANGUAGE_GUIDANCE}${names}${docs}`;
}

/**
 * Translate a project's strings with Claude, server-side; the client's
 * translateProjectContent does the AST work and sends the unique strings here.
 * Requires the ANTHROPIC_API_KEY secret bound to the function, a signed-in
 * caller, and room in that creator's daily budget (see translationBudget.ts).
 */
export default async function getLLMTranslations(
    request: CallableRequest<GetLLMTranslationsInputs>,
): Promise<string[] | null> {
    const { from, to, texts, projectContext, zone } = request.data;
    if (!Array.isArray(texts) || texts.length === 0) return [];

    // Translation costs money per call, so it is only for signed-in creators —
    // an anonymous caller cannot be held to a budget (#1073).
    if (request.auth === undefined)
        throw new HttpsError('unauthenticated', 'Sign in to translate.');

    if (texts.length > MAX_TEXTS_PER_CALL)
        throw new HttpsError('invalid-argument', 'Too many strings.');

    const cost = costOf(texts);
    if (cost > MAX_CHARACTERS_PER_CALL)
        throw new HttpsError('invalid-argument', 'Too much text.');

    // Reserve before spending; refunded below if we're the ones who fail.
    const { day } = await charge(request.auth.uid, cost, zone ?? 'UTC');
    const uid = request.auth.uid;

    try {
        const client = new Anthropic();
        const response = await client.messages.create({
            model: MODEL,
            max_tokens: MAX_TOKENS,
            thinking: { type: 'disabled' },
            system: buildSystem(from, to, projectContext),
            output_config: { format: { type: 'json_schema', schema: SCHEMA } },
            messages: [
                {
                    role: 'user',
                    content: `Translate these ${texts.length} strings from ${from} to ${to}. Return JSON {"translations":[...]} with exactly ${texts.length} entries, in the same order.\n\n${JSON.stringify(texts)}`,
                },
            ],
        });

        if (
            response.stop_reason === 'refusal' ||
            response.stop_reason === 'max_tokens'
        ) {
            await refund(uid, cost, day);
            return null;
        }

        const textBlock = response.content.find((b) => b.type === 'text');
        const translations =
            textBlock !== undefined
                ? parse(textBlock.text, texts.length)
                : null;
        if (translations === null) await refund(uid, cost, day);
        return translations;
    } catch (e) {
        console.error(e);
        await refund(uid, cost, day);
        return null;
    }
}
