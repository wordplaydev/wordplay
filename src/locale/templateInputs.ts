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
const MENTION_RE = /(?<!\$)\$(#?[a-zA-Z0-9]+|\?|!)/g;

/** Strip the `#` count marker from a declared name or a mention reference. */
export function withoutCountMarker(name: string): string {
    return name.startsWith('#') ? name.slice(1) : name;
}

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
    // Declarations carry the `#` count marker; references may or may not, and
    // either way they name the same input.
    const declaredNames = new Set(
        [...declared].map((name) => withoutCountMarker(name)),
    );
    for (const m of template.matchAll(MENTION_RE)) {
        const name = withoutCountMarker(m[1]);
        if (name === '?' || name === '!') continue;
        if (/^[0-9]+$/.test(name)) {
            numeric.add(parseInt(name, 10));
            continue;
        }
        if (declaredNames.has(name)) named.add(name);
        else if (terms.has(name)) term.add(name);
        else unknown.add(name);
    }
    return { named, numeric, term, unknown };
}

/** A `$#name[…]` branch found in a template: its input and how many arms it has. */
export type PluralBranch = { name: string; arms: number };

/**
 * Every `$#name[…]` branch in a template, with its arm count. Counts `|`
 * separators at the top level of the bracket group, so a nested branch inside
 * an arm doesn't inflate the count. Mirrors the parser: `[` opens a branch only
 * immediately after a mention, and doubling a symbol escapes it.
 */
export function getPluralBranches(template: string): PluralBranch[] {
    const branches: PluralBranch[] = [];
    const start = /(?<!\$)\$#([a-zA-Z0-9]+)\[/g;
    for (const match of template.matchAll(start)) {
        let depth = 1;
        let arms = 1;
        for (let i = match.index + match[0].length; i < template.length; i++) {
            const c = template[i];
            // A doubled delimiter is an escaped literal, not structure.
            if (
                (c === '[' || c === ']' || c === '|') &&
                template[i + 1] === c
            ) {
                i++;
                continue;
            }
            if (c === '[') depth++;
            else if (c === ']') {
                depth--;
                if (depth === 0) break;
            } else if (c === '|' && depth === 1) arms++;
        }
        branches.push({ name: match[1], arms });
    }
    return branches;
}

/** What's wrong with a template's plural branches, if anything. */
export type PluralProblems = {
    /** Marked branches whose arm count doesn't match the locale's form count. */
    arity: { name: string; found: number; expected: number }[];
    /** Count inputs the template mentions without selecting a form. */
    missing: string[];
};

/**
 * Check a template's plural branches against a locale's plural forms: every
 * `$#name[…]` needs exactly one arm per form, and every declared count input
 * needs a marked branch — a translation that drops the branch reads
 * ungrammatically at 1, which is the bug this machinery exists to prevent.
 *
 * Shared by the verifier (CI) and the localization editor (edit time) so they
 * can't disagree. `expected` comes from the locale being checked, not en-US.
 */
export function checkPluralBranches(
    fieldPath: string,
    template: string,
    /** How many plural forms the locale of this template distinguishes. */
    forms: number,
): PluralProblems | undefined {
    const declared = getDeclaredInputs().get(fieldPath);
    if (declared === undefined) return undefined;
    if (isUnwritten(template)) return { arity: [], missing: [] };

    const cleaned = withoutAnnotations(template);
    const branches = getPluralBranches(cleaned);

    const arity = branches
        .filter((branch) => branch.arms !== forms)
        .map((branch) => ({
            name: branch.name,
            found: branch.arms,
            expected: forms,
        }));

    const counts = declared
        .filter((name) => name.startsWith('#'))
        .map((name) => withoutCountMarker(name));
    const missing = counts.filter(
        (name) =>
            cleaned.includes(`$${name}`) &&
            !branches.some((branch) => branch.name === name),
    );

    return { arity, missing };
}

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
        if (!named.has(withoutCountMarker(name)))
            unused.push(withoutCountMarker(name));
    return {
        numeric: [...numeric].sort((a, b) => a - b),
        unused,
        unknown: [...unknown].sort(),
    };
}
