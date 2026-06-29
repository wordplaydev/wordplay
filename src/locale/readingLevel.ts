/**
 * Shared plain-language guidance for translation and reading-level analysis.
 *
 * Based on WCAG 2.2 Success Criterion 3.1.5, Reading Level (Level AAA):
 * https://www.w3.org/WAI/WCAG22/Understanding/reading-level.html
 *
 * We target a *lower-secondary* reading level via concrete plain-language
 * principles rather than a country-specific grade level — grade levels are
 * culturally specific and don't suit Wordplay's multilingual audience.
 *
 * Keep in sync with functions/src/shared/readingLevel.ts (the functions↔src wall
 * prevents a single shared module).
 */
export const PLAIN_LANGUAGE_GUIDANCE = `Write at a lower-secondary reading level, following WCAG 2.2 plain-language guidance (Success Criterion 3.1.5). Do not use country-specific grade levels. Apply these plain-language principles:
- Keep sentences short, each expressing a single idea.
- Use common, everyday words; avoid rare, technical, or unusual words unless they are defined (key terms are defined in the glossary).
- Keep each paragraph to a single topic.
- Spell out or explain abbreviations and acronyms.
- Use the active voice and direct action verbs.
- Avoid idioms, metaphors, and figurative language, which often do not translate across cultures.

Proper names and titles are exempt (per WCAG SC 3.1.5): do not count them as unusual or complex words.`;
