/**
 * Plural-form selection, enough of it to render a notice.
 *
 * A mirror of `src/locale/plurals.ts` — only the parts an email needs, which
 * is category order and arm selection, not the translator-facing examples.
 * `functions/` compiles with its own `rootDir` and cannot import that file;
 * `emailPluralsSync.test.ts` runs both against one table.
 *
 * `moderation.strike.notification` is the reason this exists: it is
 * `"Warning $#count[1|$count] about…"`, and a locale writes one arm per form
 * it distinguishes.
 */

/** Every plural category CLDR defines, in canonical order — the order a
 *  template's arms are written in. `Intl.PluralRules` reports alphabetically. */
export const PluralCategories = [
    'zero',
    'one',
    'two',
    'few',
    'many',
    'other',
] as const;

export type PluralCategory = (typeof PluralCategories)[number];

/** Whether Intl named a category this table knows; the lib types the list
 *  of categories as plain strings. */
function isPluralCategory(category: string): category is PluralCategory {
    return PluralCategories.some((known) => known === category);
}

function categoryOrder(category: string): number {
    const index = PluralCategories.findIndex((known) => known === category);
    return index === -1 ? PluralCategories.length - 1.5 : index;
}

const rulesByLanguage = new Map<string, Intl.PluralRules | undefined>();

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

/** The categories this language distinguishes, in canonical order. An unknown
 *  tag gets `['other']`, the one category every language has. */
export function getPluralCategories(language: string): PluralCategory[] {
    const cached = categoriesByLanguage.get(language);
    if (cached) return cached;
    const rules = getRules(language);
    const named: PluralCategory[] =
        rules === undefined
            ? ['other']
            : rules.resolvedOptions().pluralCategories.filter(isPluralCategory);
    const categories = named.sort(
        (a, b) => categoryOrder(a) - categoryOrder(b),
    );
    categoriesByLanguage.set(language, categories);
    return categories;
}

/** The index of the arm describing this value. Callers clamp to the arms
 *  actually present: a string with too few should degrade to its last form. */
export function selectPluralIndex(language: string, value: number): number {
    const rules = getRules(language);
    if (rules === undefined) return 0;
    const category = rules.select(value);
    const categories = getPluralCategories(language);
    const index = categories.findIndex((known) => known === category);
    return index === -1 ? categories.length - 1 : index;
}
