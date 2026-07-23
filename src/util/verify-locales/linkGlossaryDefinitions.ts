/**
 * Author-side pass for issue #1227: add cross-reference links to glossary
 * definitions in every locale, so a definition that mentions another glossary
 * term (e.g. "value", "parameter") or a core concept (e.g. "function") renders
 * that word as a link instead of plain prose.
 *
 * Deterministic (no API key): whole-word, first-mention-per-definition matching
 * of each locale's own glossary words and concept names against its own
 * definitions. A matched glossary word becomes `@<glossaryId>` (→ TermRef); a
 * matched concept name becomes `@<conceptKey>` (the canonical, locale-independent
 * key, → ConceptLink). Existing `@`-refs, `$`-mentions, and `\code\` are left
 * untouched, and a definition never links a word to its own term.
 *
 * It rewrites `src/locale/en-US.json` and every `static/locales/<loc>/<loc>.json`
 * (write-if-changed, Prettier-formatted), so re-runs don't churn git.
 *
 * Run: npx tsx src/util/verify-locales/linkGlossaryDefinitions.ts
 */
import fs from 'fs';
import path from 'path';
import writeFormatted from '@util/verify-locales/writeFormatted';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import {
    isRecord,
    protectedRanges,
    escapeRegExp,
} from '@util/verify-locales/markupText';

/** Glossary ids whose word is almost always an everyday word (not the term). */
const EXCLUDE_GLOSSARY = new Set(['start']);

/**
 * Concept keys (locale-independent) worth linking from a definition. An
 * ALLOWLIST, not a denylist: most concept names are everyday words
 * (name/list/text/row/is/this/word/changed…) that would over-link, and several
 * names collide across sections — restricting the vocabulary to these keys keeps
 * matches precise and collision-free. Extend after reviewing the diff.
 */
const CONCEPT_ALLOW = new Set([
    'FunctionDefinition',
    'Output',
    'Program',
    'Input',
    'Color',
    'Time',
    'Number',
    'Text',
    'List',
    'Map',
    'Table',
    'Boolean',
]);

const CONCEPT_SECTIONS = ['node', 'basis', 'input', 'output'] as const;

/** A single concept name is one letter-led token (no spaces, no emoji/symbols). */
function isPlainName(name: string): boolean {
    return /^[\p{L}][\p{L}\p{N}]*$/u.test(name);
}

/** Split a leading run of write-status markers ($?/$!/$~) from the body. */
function splitAnnotations(text: string): { prefix: string; body: string } {
    const m = /^((?:\$[?!~])+)([\s\S]*)$/.exec(text);
    return m ? { prefix: m[1], body: m[2] } : { prefix: '', body: text };
}

/** First whole-word, unprotected, non-member occurrence of `surface`
 *  (case-insensitive, Unicode word boundaries) in `text`, or null. */
function findMatch(
    text: string,
    surface: string,
    ranges: Array<[number, number]>,
): { start: number; length: number } | null {
    const re = new RegExp(
        `(?<![\\p{L}\\p{N}])${escapeRegExp(surface)}(?![\\p{L}\\p{N}])`,
        'giu',
    );
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
        const start = m.index;
        if (
            text[start - 1] !== '.' &&
            !ranges.some(([s, e]) => start >= s && start < e)
        )
            return { start, length: m[0].length };
        if (m[0].length === 0) re.lastIndex++;
    }
    return null;
}

type Candidate = { surface: string; token: string };

/** Insert links into one definition body, first-mention-per-token. Candidates
 *  are tried in order; longer surfaces first within a group. */
function linkBody(body: string, candidates: Candidate[]): string {
    let out = body;
    // Seed with tokens already referenced, so an existing `@ref` counts as the
    // first mention (keeps re-runs idempotent and one link per term).
    const linked = new Set<string>();
    for (const m of body.matchAll(/@([\p{L}][\p{L}\p{N}]*)/gu)) linked.add(m[1]);
    for (const { surface, token } of candidates) {
        if (linked.has(token)) continue;
        const match = findMatch(out, surface, protectedRanges(out));
        if (match === null) continue;
        out =
            out.slice(0, match.start) +
            '@' +
            token +
            out.slice(match.start + match.length);
        linked.add(token);
    }
    return out;
}

function readJSON(file: string): Record<string, unknown> | undefined {
    const json: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
    return isRecord(json) ? json : undefined;
}

/** Build the concept-name → key vocabulary for one locale, from allowlisted keys. */
function conceptVocab(
    json: Record<string, unknown>,
    glossaryWords: Set<string>,
): Map<string, string> {
    const vocab = new Map<string, string>();
    for (const section of CONCEPT_SECTIONS) {
        const block = json[section];
        if (!isRecord(block)) continue;
        for (const [key, entry] of Object.entries(block)) {
            if (!CONCEPT_ALLOW.has(key) || !isRecord(entry)) continue;
            const raw = entry['name'] ?? entry['names'];
            const names = Array.isArray(raw) ? raw : [raw];
            for (const value of names) {
                if (typeof value !== 'string') continue;
                const name = withoutAnnotations(value).trim();
                if (!isPlainName(name)) continue;
                const lower = name.toLowerCase();
                // A glossary word wins over a concept of the same spelling.
                if (glossaryWords.has(lower)) continue;
                if (!vocab.has(lower)) vocab.set(lower, key);
            }
        }
    }
    return vocab;
}

/** Insert links into a locale's glossary definitions in place; returns the count. */
function linkDefinitions(json: Record<string, unknown>): number {
    const glossary = json['glossary'];
    if (!isRecord(glossary)) return 0;

    // Glossary word → id (annotation-free), minus excluded ids.
    const wordToId = new Map<string, string>();
    for (const [id, entry] of Object.entries(glossary)) {
        if (EXCLUDE_GLOSSARY.has(id) || !isRecord(entry)) continue;
        const word = withoutAnnotations(String(entry['word'] ?? '')).trim();
        if (word.length > 0) wordToId.set(word.toLowerCase(), id);
    }
    const glossaryWords = new Set(wordToId.keys());
    const concepts = conceptVocab(json, glossaryWords);

    let added = 0;
    for (const [id, entry] of Object.entries(glossary)) {
        if (!isRecord(entry) || typeof entry['definition'] !== 'string')
            continue;
        const { prefix, body } = splitAnnotations(entry['definition']);
        if (body.trim().length === 0) continue;

        // Glossary words first (a word that is both a term and a concept links as
        // the term), excluding this entry's own id; then concept names. Longer
        // surfaces first so a phrase wins over a substring.
        const candidates: Candidate[] = [
            ...[...wordToId]
                .filter(([, wid]) => wid !== id)
                .map(([surface, token]) => ({ surface, token })),
            ...[...concepts].map(([surface, token]) => ({ surface, token })),
        ].sort((a, b) => b.surface.length - a.surface.length);

        const linked = linkBody(body, candidates);
        if (linked !== body) {
            entry['definition'] = prefix + linked;
            added += 1;
        }
    }
    return added;
}

async function run(): Promise<void> {
    const files = ['src/locale/en-US.json'];
    const localesDir = path.join('static', 'locales');
    for (const dir of fs.readdirSync(localesDir, { withFileTypes: true }))
        if (dir.isDirectory()) {
            const file = path.join(localesDir, dir.name, `${dir.name}.json`);
            if (fs.existsSync(file)) files.push(file);
        }

    let total = 0;
    for (const file of files) {
        const json = readJSON(file);
        if (json === undefined) continue;
        const added = linkDefinitions(json);
        if (added > 0) {
            await writeFormatted(file, JSON.stringify(json, null, 4));
            total += added;
        }
        console.log(`${file}: linked ${added} definition(s)`);
    }
    console.log(`\nDone. Linked ${total} definitions across ${files.length} locales.`);
}

await run();
