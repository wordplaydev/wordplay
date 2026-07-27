/**
 * One-time pass: add glossary-term links (`@term`) to en-US concept documentation
 * and tutorial dialogue, so translations inherit them.
 *
 * Deliberately conservative:
 *  - Glossary terms only — never concept links.
 *  - Only concept `doc` fields (under node/basis/input/output) and tutorial
 *    dialogue — never UI strings, conflict explanations, glossary definitions,
 *    names, code, character, or emotion fields.
 *  - Only the FIRST mention of each term per unit (a concept's whole doc, or one
 *    tutorial line's dialogue), enforced here regardless of what the model returns.
 *
 * Edit-based: Claude only proposes { find, replace } pairs; we apply them to the
 * original text, so the model can never reword the source. An edit applies only
 * when `replace` is `@<glossaryId>` whose word matches `find`, `find` is a whole
 * word outside any `\code\` block / existing `@`-reference, and that term hasn't
 * already been linked in this unit.
 *
 * Run: ANTHROPIC_API_KEY must be set.
 *   npx tsx src/util/verify-locales/linkGlossary.ts
 */
import '@util/verify-locales/loadEnv';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import writeFormatted from '@util/verify-locales/writeFormatted';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import { getKeyTemplatePairs } from '@util/verify-locales/LocalePath';
import {
    isRecord,
    protectedRanges,
    findWholeWord,
} from '@util/verify-locales/markupText';

const MODEL = 'claude-opus-4-8';
const MAX_TOKENS = 16000;
const CHUNK = 30;

// --- Vocabulary (glossary terms only) -------------------------------------

// Read en-US.json directly (not via the DefaultLocale module) to avoid a flaky
// circular module-init under tsx.
const sourceLocale: unknown = JSON.parse(
    fs.readFileSync('src/locale/en-US.json', 'utf8'),
);
const glossarySection = isRecord(sourceLocale)
    ? sourceLocale['glossary']
    : undefined;

/** Glossary ids too ambiguous to auto-link: their word almost always appears in
 *  an everyday sense (e.g. "start" as a beginning/edge, not the source-file term),
 *  so they produce false positives. Link these by hand where genuinely meant. */
const EXCLUDE = new Set(['start']);

/** Glossary id → annotation-free word. */
const glossary = new Map<string, string>();
if (isRecord(glossarySection))
    for (const [id, entry] of Object.entries(glossarySection))
        if (
            !EXCLUDE.has(id) &&
            isRecord(entry) &&
            typeof entry['word'] === 'string'
        )
            glossary.set(id, withoutAnnotations(entry['word']));

// --- Markup-aware text helpers -------------------------------------------

const CANDIDATE = new RegExp(
    `(?<![\\p{L}\\p{N}])(?:${[...glossary.values()]
        .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|')})(?![\\p{L}\\p{N}])`,
    'iu',
);
function hasCandidate(text: string): boolean {
    return CANDIDATE.test(text);
}

/** Valid only as `@<glossaryId>` whose word matches the found text. */
function glossaryIdFor(replace: string, find: string): string | undefined {
    const m = /^@([a-zA-Z0-9]+)$/.exec(replace);
    if (m === null) return undefined;
    const id = m[1];
    const word = glossary.get(id);
    return word !== undefined && find.toLowerCase() === word.toLowerCase()
        ? id
        : undefined;
}

/** Apply edits to one string, skipping terms already linked in this unit
 *  (first-mention-per-unit) and recording newly linked ids. */
function applyEdits(
    text: string,
    edits: { find: string; replace: string }[],
    linked: Set<string>,
): { text: string; added: number } {
    let out = text;
    let added = 0;
    for (const edit of edits) {
        if (typeof edit.find !== 'string' || typeof edit.replace !== 'string')
            continue;
        const id = glossaryIdFor(edit.replace, edit.find);
        if (id === undefined || linked.has(id)) continue;
        const i = findWholeWord(out, edit.find, protectedRanges(out));
        if (i < 0) continue;
        out = out.slice(0, i) + `@${id}` + out.slice(i + edit.find.length);
        linked.add(id);
        added++;
    }
    return { text: out, added };
}

// --- Claude edit pass -----------------------------------------------------

const SYSTEM = `You add glossary-term links to Wordplay's English documentation and tutorial dialogue. For each input string, find words that CLEARLY and unambiguously refer to one of the glossary terms below, and propose replacing that exact word with an \`@<glossaryId>\` link.

Be conservative:
- Link a word ONLY when it clearly refers to the specific Wordplay glossary term — never an everyday meaning. Do NOT link "start" (a beginning or cursor position), "project" (the platform or a body of work), "source" (source code or a repository), "link" (a web link), or words like "name", "value", "type", "code" when used in their ordinary English sense.
- Link at most the FIRST occurrence of each term in a string.
- These are glossary terms only — do NOT link concepts or anything else.

Rules:
- "find" must be an exact, whole-word substring of the string. Never touch text inside \\code\\ blocks or existing @ references.
- Only use the glossary ids listed below.
- Return { "edits": [] } for a string with no clear glossary references.

Return, per input string, { "edits": [ { "find": <the exact word as it appears>, "replace": "@<glossaryId>" } ] }, in the same order as the inputs.

Glossary terms (@id — word):
${[...glossary].map(([id, word]) => `- @${id} — ${word}`).join('\n')}`;

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
                    edits: {
                        type: 'array',
                        items: {
                            type: 'object',
                            additionalProperties: false,
                            properties: {
                                find: { type: 'string' },
                                replace: { type: 'string' },
                            },
                            required: ['find', 'replace'],
                        },
                    },
                },
                required: ['edits'],
            },
        },
    },
    required: ['results'],
};

const client = new Anthropic({ maxRetries: 4 });

type Edit = { find: string; replace: string };
function parseEdits(text: string, expected: number): Edit[][] | null {
    let data: unknown;
    try {
        data = JSON.parse(text);
    } catch {
        return null;
    }
    if (!isRecord(data) || !Array.isArray(data.results)) return null;
    if (data.results.length !== expected) return null;
    return data.results.map((r) =>
        isRecord(r) && Array.isArray(r.edits)
            ? r.edits.filter(
                  (e): e is Edit =>
                      isRecord(e) &&
                      typeof e.find === 'string' &&
                      typeof e.replace === 'string',
              )
            : [],
    );
}

/** A string to link, sharing a `linked` set with the other strings of its unit
 *  (a concept's doc, or one tutorial line's dialogue) for first-mention dedup. */
type Item = { text: string; linked: Set<string> };

/** Link a batch of items; returns the linked text + count for each (unchanged
 *  when it has no candidate or the model fails). Items are processed in order so
 *  first-mention-per-unit holds across a unit's strings. */
async function linkTexts(
    items: Item[],
): Promise<{ text: string; added: number }[]> {
    const result = items.map((item) => ({ text: item.text, added: 0 }));
    const todo = items
        .map((item, index) => ({ text: item.text, index }))
        .filter(({ text }) => hasCandidate(text));
    for (let i = 0; i < todo.length; i += CHUNK) {
        const chunk = todo.slice(i, i + CHUNK);
        process.stdout.write(`  …linking ${i + chunk.length}/${todo.length}\r`);
        let edits: Edit[][] | null = null;
        try {
            const response = await client.messages.create({
                model: MODEL,
                max_tokens: MAX_TOKENS,
                system: [
                    {
                        type: 'text',
                        text: SYSTEM,
                        cache_control: { type: 'ephemeral' },
                    },
                ],
                output_config: {
                    format: { type: 'json_schema', schema: SCHEMA },
                },
                messages: [
                    {
                        role: 'user',
                        content: `Add glossary links to these ${chunk.length} strings. Return JSON {"results":[...]} with exactly ${chunk.length} entries, in order.\n\n${JSON.stringify(
                            chunk.map((c) => c.text),
                        )}`,
                    },
                ],
            });
            if (
                response.stop_reason !== 'refusal' &&
                response.stop_reason !== 'max_tokens'
            ) {
                const block = response.content.find((b) => b.type === 'text');
                if (block !== undefined)
                    edits = parseEdits(block.text, chunk.length);
            }
        } catch (e) {
            console.error('\n  request failed:', e);
        }
        if (edits === null) continue;
        chunk.forEach((c, j) => {
            result[c.index] = applyEdits(
                c.text,
                edits[j],
                items[c.index].linked,
            );
        });
    }
    process.stdout.write('\n');
    return result;
}

// --- File processing ------------------------------------------------------

const CONCEPT_SECTIONS = new Set(['node', 'basis', 'input', 'output']);

async function processLocale(): Promise<void> {
    const path = 'src/locale/en-US.json';
    console.log(`\n${path} (concept docs)`);
    const json: unknown = JSON.parse(fs.readFileSync(path, 'utf8'));
    if (!isRecord(json)) return;
    // Only `doc` fields under a concept section — a concept's documentation.
    const pairs = getKeyTemplatePairs(json).filter(
        (p) =>
            p.key === 'doc' &&
            typeof p.path[0] === 'string' &&
            CONCEPT_SECTIONS.has(p.path[0]),
    );

    // Each doc field is one unit: its paragraphs share a `linked` set so each
    // term is linked at most once across the whole doc.
    const slots: { pair: (typeof pairs)[number]; index: number | null }[] = [];
    const items: Item[] = [];
    for (const pair of pairs) {
        const linked = new Set<string>();
        if (typeof pair.value === 'string') {
            slots.push({ pair, index: null });
            items.push({ text: pair.value, linked });
        } else if (Array.isArray(pair.value)) {
            pair.value.forEach((v, i) => {
                if (typeof v === 'string') {
                    slots.push({ pair, index: i });
                    items.push({ text: v, linked });
                }
            });
        }
    }

    const linked = await linkTexts(items);
    const arrays = new Map<(typeof pairs)[number], string[]>();
    let added = 0;
    slots.forEach((slot, i) => {
        added += linked[i].added;
        if (slot.index === null) {
            if (linked[i].added > 0) slot.pair.repair(json, linked[i].text);
        } else {
            let arr = arrays.get(slot.pair);
            if (arr === undefined) {
                arr = Array.isArray(slot.pair.value)
                    ? [...slot.pair.value]
                    : [];
                arrays.set(slot.pair, arr);
            }
            arr[slot.index] = linked[i].text;
        }
    });
    for (const [pair, arr] of arrays) pair.repair(json, arr);

    if (added > 0) await writeFormatted(path, JSON.stringify(json, null, 4));
    console.log(`  added ${added} link(s)`);
}

async function processTutorial(path: string): Promise<void> {
    if (!fs.existsSync(path)) return;
    console.log(`\n${path} (dialogue)`);
    const tutorial: unknown = JSON.parse(fs.readFileSync(path, 'utf8'));
    const acts = isRecord(tutorial) ? tutorial['acts'] : undefined;
    if (!Array.isArray(acts)) return;

    // Each line's dialogue is one unit: line = [character, emotion, ...dialogue];
    // its dialogue strings share a `linked` set (first mention per line).
    const slots: { line: unknown[]; index: number }[] = [];
    const items: Item[] = [];
    for (const act of acts) {
        const scenes = isRecord(act) ? act['scenes'] : undefined;
        if (!Array.isArray(scenes)) continue;
        for (const scene of scenes) {
            const lines = isRecord(scene) ? scene['lines'] : undefined;
            if (!Array.isArray(lines)) continue;
            for (const line of lines) {
                if (!Array.isArray(line)) continue;
                const linked = new Set<string>();
                for (let m = 2; m < line.length; m++)
                    if (typeof line[m] === 'string') {
                        slots.push({ line, index: m });
                        items.push({ text: line[m], linked });
                    }
            }
        }
    }

    const linked = await linkTexts(items);
    let added = 0;
    slots.forEach((slot, i) => {
        added += linked[i].added;
        if (linked[i].added > 0) slot.line[slot.index] = linked[i].text;
    });
    if (added > 0)
        await writeFormatted(path, JSON.stringify(tutorial, null, 4));
    console.log(`  added ${added} link(s)`);
}

if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set.');
    process.exit(1);
}
await processLocale();
await processTutorial('static/locales/en-US/en-US-tutorial.json');
await processTutorial('static/locales/en-US/en-US-tutorial-quick.json');
console.log('\nDone. Review the diff before translating.');
