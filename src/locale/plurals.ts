/**
 * Plural-form selection for localized templates, shared by the runtime (a
 * marked `$#count[…]` branch), the locale verifier, the machine translator, and
 * the in-app localization editor — so all four agree on what a valid plural
 * string is for a given locale.
 *
 * Lives in `src/locale/` rather than `src/util/verify-locales/` for the reason
 * `templateInputs.ts` does: the localization editor runs this in the browser.
 */

/**
 * Every plural category CLDR defines, in canonical order. This is a closed set
 * — a language uses a *subset*, never a new category — so a locale we add later
 * needs no change here; its arity is derived from `Intl.PluralRules` at runtime.
 * `plurals.test.ts` guards the assumption across every language code we know.
 *
 * The order matters: it's the order a template's arms are written in, and
 * `Intl.PluralRules` reports categories alphabetically, not canonically.
 */
export const PluralCategories = [
    'zero',
    'one',
    'two',
    'few',
    'many',
    'other',
] as const;

export type PluralCategory = (typeof PluralCategories)[number];

/** Sort key for a category, with anything unrecognized placed just before
 *  `other` rather than dropped — if ICU ever grows a seventh category, its arm
 *  still has a defined position instead of silently shifting the rest. */
function categoryOrder(category: string): number {
    const index = PluralCategories.indexOf(category as PluralCategory);
    return index === -1 ? PluralCategories.length - 1.5 : index;
}

const rulesByLanguage = new Map<string, Intl.PluralRules | undefined>();

/** This language's plural rules, or undefined for a tag Intl won't accept. A
 *  malformed or multilingual tag falls back rather than throwing, matching
 *  `firstSentence.ts` and `runtime/pattern/segment.ts`. */
function getRules(language: string): Intl.PluralRules | undefined {
    if (rulesByLanguage.has(language)) return rulesByLanguage.get(language);
    let rules: Intl.PluralRules | undefined;
    try {
        rules = new Intl.PluralRules(language === '' ? undefined : language);
    } catch {
        rules = undefined;
    }
    rulesByLanguage.set(language, rules);
    return rules;
}

const categoriesByLanguage = new Map<string, PluralCategory[]>();

/**
 * The plural categories this language distinguishes, in canonical order — one
 * per arm a plural template needs. English gets 2, Japanese 1, Polish 4,
 * Arabic 6. An unknown tag gets `['other']`, the one category every language
 * has, so an unrecognized locale degrades to a single form.
 */
export function getPluralCategories(language: string): PluralCategory[] {
    const cached = categoriesByLanguage.get(language);
    if (cached) return cached;
    const rules = getRules(language);
    const categories = (
        rules === undefined
            ? ['other']
            : [...rules.resolvedOptions().pluralCategories]
    ).sort((a, b) => categoryOrder(a) - categoryOrder(b)) as PluralCategory[];
    categoriesByLanguage.set(language, categories);
    return categories;
}

/** How many arms a plural template needs in this language. */
export function getPluralCount(language: string): number {
    return getPluralCategories(language).length;
}

/**
 * The index of the arm that describes this value in this language. Callers
 * clamp to the arms actually present: a locale string with too few arms should
 * degrade to its last form, not fail to render.
 */
export function selectPluralIndex(language: string, value: number): number {
    const rules = getRules(language);
    if (rules === undefined) return 0;
    const category = rules.select(value);
    const index = getPluralCategories(language).indexOf(
        category as PluralCategory,
    );
    // `select` returned something not in this locale's own category list:
    // fall back to the last arm, which is always `other`.
    return index === -1 ? getPluralCategories(language).length - 1 : index;
}

const examplesByLanguage = new Map<string, number[]>();

/**
 * Candidate numbers to illustrate a category with, in preference order: small
 * integers first, then the large ones French and Spanish reserve `many` for,
 * then fractions — which Polish and Russian `other`, and Czech `many`, are
 * *only* reachable by, since those categories cover decimals alone.
 */
const ExampleProbes = [
    ...Array.from({ length: 201 }, (_, n) => n),
    1000,
    10000,
    100000,
    1000000,
    2000000,
    0.5,
    1.5,
    2.5,
    10.5,
];

/**
 * A representative number for each of this language's categories, in the same
 * order — the first probe that selects it. Shown to translators beside each arm
 * so they can see which numbers a form covers (Arabic: 0, 1, 2, 3, 11, 100;
 * French: 0, 1000000, 2). Derived rather than tabulated, so it's correct for
 * any locale we add.
 */
export function getPluralExamples(language: string): number[] {
    const cached = examplesByLanguage.get(language);
    if (cached) return cached;
    const examples = getPluralCategories(language).map((_, index) => {
        const probe = ExampleProbes.find(
            (n) => selectPluralIndex(language, n) === index,
        );
        return probe ?? 0;
    });
    examplesByLanguage.set(language, examples);
    return examples;
}

/**
 * The plural rule for a machine-translation prompt: how many arms a `$#name[…]`
 * branch takes in the target locale, in what order, and which numbers each form
 * covers. Written here, beside the rules themselves, so the instruction can
 * never drift from what the verifier enforces.
 */
export function getPluralRulesForPrompt(targetLocale: string): string {
    const categories = getPluralCategories(targetLocale);
    const examples = getPluralExamples(targetLocale);
    const forms = categories
        .map((category, index) => `${category} (e.g. ${examples[index]})`)
        .join(', ');
    const count = categories.length;
    return `  - A $#name reference is a count, and the bracket group right after it holds one version of the sentence per plural form the language has, separated by |. ${targetLocale} has ${count}: ${forms}. Write EXACTLY ${count} version${count === 1 ? '' : 's'}, in that order, no matter how many the English has (English has 2 and needs no more). Keep the bracket attached to the $#name with no space, and make each version read naturally for the numbers it covers.`;
}
