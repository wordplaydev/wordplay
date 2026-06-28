import Anthropic from '@anthropic-ai/sdk';
import type { CallableRequest } from 'firebase-functions/v2/https';
import type { GetLLMTranslationsInputs } from 'shared-types';
import { PLAIN_LANGUAGE_GUIDANCE } from './shared/readingLevel.js';

const MODEL = 'claude-opus-4-8';
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
 * Translate a project's strings with Claude, server-side. Mirrors the
 * string-translation role of [getTranslations](functions/src/getTranslations.ts)
 * (the client's translateProjectContent does the AST work), with a
 * markup-preserving prompt and optional project context for quality. Requires
 * the ANTHROPIC_API_KEY secret bound to the function.
 */
export default async function getLLMTranslations(
    request: CallableRequest<GetLLMTranslationsInputs>,
): Promise<string[] | null> {
    const { from, to, texts, projectContext } = request.data;
    if (!Array.isArray(texts) || texts.length === 0) return [];

    try {
        const client = new Anthropic();
        const response = await client.messages.create({
            model: MODEL,
            max_tokens: MAX_TOKENS,
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
        )
            return null;

        const textBlock = response.content.find((b) => b.type === 'text');
        return textBlock !== undefined
            ? parse(textBlock.text, texts.length)
            : null;
    } catch (e) {
        console.error(e);
        return null;
    }
}
