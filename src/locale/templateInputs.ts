/**
 * Shared template-input introspection used by both the verifier (CI-time) and
 * the in-app localizer (edit-time). The per-field declared input names and
 * the terminology key set live in a codegen module (`templateInputs.generated.ts`),
 * which the `npm run locale-schema` step produces from
 * `static/schemas/LocaleText.json`. That avoids importing the schema JSON
 * directly — `static/` is Vite's public directory, so importing from it in
 * browser code triggers a warning and bundles ~330 KB of unused schema.
 *
 * Names in templates are referenced as `$<name>`. The runtime tokenizer rule
 * (`MentionRegEx` in `Tokenizer.ts`) is the canonical definition of what
 * counts as a mention; this module accepts the same set.
 */
import { isUnwritten } from '@locale/LocaleText';
import { DECLARED_INPUTS } from '@locale/templateInputs.generated';
import { withoutAnnotations } from '@locale/withoutAnnotations';

/** Field path -> ordered list of declared input names. */
type InputsByField = Map<string, string[]>;

let cache: InputsByField | undefined;

/** Walk the codegen table and return the declared inputs for every Template-typed field. */
export function getDeclaredInputs(): InputsByField {
    if (cache) return cache;
    cache = new Map();
    for (const [k, v] of Object.entries(DECLARED_INPUTS)) cache.set(k, [...v]);
    return cache;
}

let allInputNames: Set<string> | undefined;

/** The union of every template input name declared across the schema. A term
 *  key must avoid all of these so a `$name` reference is never ambiguous; used
 *  by the verifier and the in-app terms editor to reject a colliding key. */
export function getAllDeclaredInputNames(): ReadonlySet<string> {
    if (allInputNames) return allInputNames;
    allInputNames = new Set<string>();
    for (const names of Object.values(DECLARED_INPUTS))
        for (const name of names) allInputNames.add(name);
    return allInputNames;
}

/**
 * Mention regex mirroring `Tokenizer.MentionRegEx`: `$?` / `$!` placeholders
 * or `$<alphanumeric>`, with a negative lookbehind so escaped `$$N` doesn't
 * match. ASCII, to match the tokenizer — this validates template *input*
 * references, which the tokenizer resolves.
 */
const MENTION_RE = /(?<!\$)\$([a-zA-Z0-9]+|\?|!)/g;

/**
 * Term-reference regex: like `MENTION_RE` but the name may be Unicode letters
 * and numbers. Word-list terms are expanded at the string level, *before* the
 * (ASCII) tokenizer runs, so their keys aren't bound by the tokenizer's ASCII
 * mention rule. Kept separate from `MENTION_RE` so input-reference validation
 * stays aligned with the tokenizer.
 */
const TERM_RE = /(?<!\$)\$([\p{L}\p{N}]+|\?|!)/gu;

/**
 * Expand `$key` terminology references in a locale string, replacing each with
 * its per-locale phrase. Runs before the string is parsed to markup or stripped
 * to plain text, so a Unicode term key never reaches the ASCII tokenizer. Terms
 * are locale constants, so this is a single, non-recursive pass (a phrase is
 * never re-scanned) — idempotent and loop-free. Only names present in `terms`
 * are replaced; `$?`/`$!` placeholders, template-input names, unknown names, and
 * escaped `$$key` are left untouched (the verifier guarantees term keys are
 * disjoint from input names, so a `$name` is never ambiguous).
 */
export function resolveTerms(
    text: string,
    terms: Readonly<Record<string, string>>,
): string {
    // Fast path: no terms defined, or no `$` to expand.
    if (text.length === 0 || text.indexOf('$') === -1) return text;
    let hasAny = false;
    for (const _key in terms) {
        hasAny = true;
        break;
    }
    if (!hasAny) return text;

    return text.replace(TERM_RE, (whole, name: string) => {
        if (name === '?' || name === '!') return whole;
        return Object.prototype.hasOwnProperty.call(terms, name)
            ? terms[name]
            : whole;
    });
}

/**
 * Categorize every `$<name>` reference in a template:
 *  - `named` — name appears in `declared`; matches a template input.
 *  - `numeric` — bare `$N` digits; legacy positional ref (now disallowed).
 *  - `term` — name is a per-locale terminology key (in `terms`); a valid word-
 *    list substitution.
 *  - `unknown` — name is neither a declared input nor a term, e.g. a translator
 *    typo like `$expecte`. Flagged so it can be fixed.
 */
export function getTemplateReferences(
    template: string,
    declared: ReadonlySet<string>,
    terms: ReadonlySet<string> = new Set(),
): {
    named: Set<string>;
    numeric: Set<number>;
    term: Set<string>;
    unknown: Set<string>;
} {
    const named = new Set<string>();
    const numeric = new Set<number>();
    const term = new Set<string>();
    const unknown = new Set<string>();
    for (const m of template.matchAll(MENTION_RE)) {
        const name = m[1];
        if (name === '?' || name === '!') continue;
        if (/^[0-9]+$/.test(name)) {
            numeric.add(parseInt(name, 10));
            continue;
        }
        if (declared.has(name)) named.add(name);
        else if (terms.has(name)) term.add(name);
        else unknown.add(name);
    }
    return { named, numeric, term, unknown };
}

/**
 * CLDR plural-category flags. When declared as template inputs, each locale
 * references only the categories its plural rules distinguish (e.g. English
 * uses just $one, Russian adds $few/$many), so they are exempt from the
 * unused-input check. (`other` is the implicit fallback, never declared.)
 */
const PLURAL_CATEGORY_INPUTS = new Set(['zero', 'one', 'two', 'few', 'many']);

/**
 * Compare a template's named refs against the declared input list for the
 * given field path. Returns the lists of problems, all empty if consistent.
 * Returns `undefined` when the field is not Template-typed in the schema.
 *
 * Treats `$?` Unwritten strings as a pass (intentional placeholder).
 */
export function checkTemplateInputs(
    fieldPath: string,
    template: string,
    /** The current locale's terminology keys, so a `$term` reference isn't
     *  flagged as an unknown input. */
    terms: ReadonlySet<string> = new Set(),
): { numeric: number[]; unused: string[]; unknown: string[] } | undefined {
    const declared = getDeclaredInputs().get(fieldPath);
    if (declared === undefined) return undefined;

    if (isUnwritten(template)) return { numeric: [], unused: [], unknown: [] };

    const cleaned = withoutAnnotations(template);
    const declaredSet = new Set(declared);
    const { named, numeric, unknown } = getTemplateReferences(
        cleaned,
        declaredSet,
        terms,
    );

    const unused: string[] = [];
    for (const name of declared)
        if (!named.has(name) && !PLURAL_CATEGORY_INPUTS.has(name))
            unused.push(name);
    return {
        numeric: [...numeric].sort((a, b) => a - b),
        unused,
        unknown: [...unknown].sort(),
    };
}
