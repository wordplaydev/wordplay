/**
 * One-time migration: rewrite glossary references from the `$term` (Mention)
 * syntax to `@term` (concept-link family), so `$` is reserved for template-input
 * substitution and `@` covers all documented-thing references (concepts + terms).
 *
 * Rule, per `$<name>` mention in a field:
 *   - name is a declared template input for that field  → keep `$name` (it's a
 *     runtime substitution, e.g. `$value` in a field that declares `value`).
 *   - else name is a glossary id (TERMINOLOGY_NAMES)    → rewrite to `@name`.
 *   - else (numeric `$1`, `$?`/`$!`, or an unknown name) → leave unchanged.
 *
 * Field paths come from the same codegen table the verifier uses
 * (`DECLARED_INPUTS`, keyed by `LocalePath.toString()` — no array indices), so
 * tutorial/how/quick files (not in the table) get an empty input set and have
 * every glossary `$term` rewritten. `$` never appears inside `\code\` (it's a
 * markup-only symbol), so no code-protection is needed; `$$` literals are skipped
 * by the mention regex's lookbehind.
 *
 * Run: npx tsx src/util/verify-locales/migrateGlossaryRefs.ts [en]
 *   (no arg = en-US.json + all static/locales/*; "en" = en-US.json only)
 */
import fs from 'fs';
import writeFormatted from '@util/verify-locales/writeFormatted';
import {
    DECLARED_INPUTS,
    TERMINOLOGY_NAMES,
} from '@locale/templateInputs.generated';

const glossary = new Set<string>(TERMINOLOGY_NAMES);
const declared = new Map<string, Set<string>>(
    Object.entries(DECLARED_INPUTS).map(([k, v]) => [k, new Set(v)]),
);

// `$word` mentions only ($?/$! and $$escapes excluded by the class + lookbehind).
const MENTION = /(?<!\$)\$([a-zA-Z0-9]+)/g;

/** Field path for DECLARED_INPUTS: the path with trailing array indices dropped
 *  (a doc array's elements share the field's declared inputs). */
function fieldPath(path: Array<string | number>): string {
    const segs = [...path];
    while (segs.length > 0 && typeof segs[segs.length - 1] === 'number')
        segs.pop();
    return segs.join('.');
}

function rewrite(text: string, path: Array<string | number>): [string, number] {
    const inputs = declared.get(fieldPath(path)) ?? new Set<string>();
    let count = 0;
    const out = text.replace(MENTION, (whole, name: string) => {
        if (inputs.has(name)) return whole; // template input
        if (glossary.has(name)) {
            count++;
            return `@${name}`; // glossary term
        }
        return whole; // numeric / unknown
    });
    return [out, count];
}

/** Mutate every string leaf in place, returning the number of rewrites. */
function walk(node: unknown, path: Array<string | number>): number {
    let count = 0;
    if (Array.isArray(node)) {
        node.forEach((v, i) => {
            if (typeof v === 'string') {
                const [out, n] = rewrite(v, [...path, i]);
                node[i] = out;
                count += n;
            } else count += walk(v, [...path, i]);
        });
    } else if (node !== null && typeof node === 'object') {
        const record = node as Record<string, unknown>;
        for (const k of Object.keys(record)) {
            const v = record[k];
            if (typeof v === 'string') {
                const [out, n] = rewrite(v, [...path, k]);
                record[k] = out;
                count += n;
            } else count += walk(v, [...path, k]);
        }
    }
    return count;
}

async function migrate(file: string): Promise<number> {
    const json: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
    const count = walk(json, []);
    if (count > 0) await writeFormatted(file, JSON.stringify(json, null, 4));
    return count;
}

const enOnly = process.argv[2] === 'en';
const files: string[] = ['src/locale/en-US.json'];
if (!enOnly) {
    for (const dir of fs.readdirSync('static/locales')) {
        const base = `static/locales/${dir}`;
        if (!fs.statSync(base).isDirectory()) continue;
        for (const f of fs.readdirSync(base)) {
            // Skip emoji files (no prose) — everything else may carry $term.
            if (f.endsWith('.json') && !f.endsWith('-emojis.json'))
                files.push(`${base}/${f}`);
        }
    }
}

let total = 0;
for (const file of files) {
    const count = await migrate(file);
    total += count;
    if (count > 0) console.log(`  ${count.toString().padStart(4)}  ${file}`);
}
console.log(
    `\nMigrated ${total} glossary reference(s) across ${files.length} file(s).`,
);
