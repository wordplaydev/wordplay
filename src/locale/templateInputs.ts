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
import {
    DECLARED_INPUTS,
    TERMINOLOGY_NAMES,
} from '@locale/templateInputs.generated';
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

let termsCache: Set<string> | undefined;

/**
 * Returns the set of terminology keys defined in `LocaleText.term`. A `$name`
 * Mention whose name is in this set is a terminology reference (resolved at
 * render time from `term[<name>]`), not a template input.
 */
export function getTerminologyNames(): Set<string> {
    if (termsCache) return termsCache;
    termsCache = new Set(TERMINOLOGY_NAMES);
    return termsCache;
}

/**
 * Mention regex mirroring `Tokenizer.MentionRegEx`: `$?` / `$!` placeholders
 * or `$<alphanumeric>`, with a negative lookbehind so escaped `$$N` doesn't
 * match.
 */
const MENTION_RE = /(?<!\$)\$([a-zA-Z0-9]+|\?|!)/g;

/**
 * Categorize every `$<name>` reference in a template:
 *  - `named` — name appears in `declared`; matches a template input.
 *  - `numeric` — bare `$N` digits; legacy positional ref (now disallowed).
 *  - `unknown` — name is neither declared nor a known terminology key, e.g.
 *    a translator typo like `$expecte`. Flagged so the translator can fix it.
 *
 * Terminology refs (`$program`, `$bind`, etc.) are resolved at render time
 * and don't count as template inputs — they're filtered out silently when
 * found in `getTerminologyNames()`.
 */
export function getTemplateReferences(
    template: string,
    declared: ReadonlySet<string>,
): { named: Set<string>; numeric: Set<number>; unknown: Set<string> } {
    const named = new Set<string>();
    const numeric = new Set<number>();
    const unknown = new Set<string>();
    const terms = getTerminologyNames();
    for (const m of template.matchAll(MENTION_RE)) {
        const name = m[1];
        if (name === '?' || name === '!') continue;
        if (/^[0-9]+$/.test(name)) {
            numeric.add(parseInt(name, 10));
            continue;
        }
        if (declared.has(name)) named.add(name);
        else if (!terms.has(name)) unknown.add(name);
    }
    return { named, numeric, unknown };
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
):
    | { numeric: number[]; unused: string[]; unknown: string[] }
    | undefined {
    const declared = getDeclaredInputs().get(fieldPath);
    if (declared === undefined) return undefined;

    if (isUnwritten(template))
        return { numeric: [], unused: [], unknown: [] };

    const cleaned = withoutAnnotations(template);
    const declaredSet = new Set(declared);
    const { named, numeric, unknown } = getTemplateReferences(
        cleaned,
        declaredSet,
    );

    const unused: string[] = [];
    for (const name of declared) if (!named.has(name)) unused.push(name);
    return {
        numeric: [...numeric].sort((a, b) => a - b),
        unused,
        unknown: [...unknown].sort(),
    };
}
