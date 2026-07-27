/**
 * A per-locale word list: arbitrary keys mapped to plain phrases. Wherever a
 * locale string contains `$key`, the phrase for `key` is substituted at render
 * time (in both plain and formatted text), letting a locale keep the same word
 * consistent everywhere and change it in one place.
 *
 * This is per-locale original content — each locale chooses its own keys — so,
 * like `guidance`, it is never machine translated and its keys are not required
 * to match en-US. Keys must be alphanumeric identifiers starting with a letter
 * and disjoint from every template input name, so a `$name` reference is never
 * ambiguous; the locale verifier enforces both. Distinct from the glossary,
 * whose `@term` references render as interactive links with a definition.
 */
type TermsTexts = Record<string, TermPhrase>;

/** [plain] The phrase substituted wherever `$key` for this term appears. */
export type TermPhrase = string;

export { type TermsTexts as default };
