// FUNCTION emailExists
export type EmailExistsInputs = string[];
export type EmailExistsOutput = Record<string, boolean> | undefined;

// FUNCTION getLLMTranslations
/** Translate a project's strings with an LLM (Claude). The client's
 *  translateProjectContent handles the AST (names, docs, text) and sends the
 *  unique strings here; project context improves domain-appropriate word
 *  choices. Returns translations 1:1 with `texts`, or null on failure. */
export type GetLLMTranslationsInputs = {
    /** Source locale string, e.g. 'en-US'. */
    from: string;
    /** Target locale string, e.g. 'es-MX'. */
    to: string;
    /** The unique source strings to translate, in order. */
    texts: string[];
    /** Optional context for quality: a sample of the project's other names and
     *  docs so translations fit the project's domain. */
    projectContext?: { names?: string[]; docs?: string[] };
    /** The caller's IANA time zone, so the daily translation budget resets at
     *  the creator's own midnight. Advisory: the server only ever moves the
     *  budget's day key forward, so a spoofed zone can delay a reset but never
     *  buy an early one. Falls back to UTC when absent or unrecognized. */
    zone?: string;
};
export type GetLLMTranslationsOutput = string[] | null;

/** The `details` payload on a `resource-exhausted` rejection from a translation
 *  callable, so the client can show the meter and the wait rather than a generic
 *  failure. `resetsAt` is epoch milliseconds. */
export type TranslationBudgetDetails = {
    used: number;
    limit: number;
    resetsAt: number;
};

// FUNCTION analyzeLocalization
/** A glossary id + its localized word, plus that word's other written forms
 *  (plurals, conjugations, synonyms), for the literal-term check. */
export type GlossaryWord = { id: string; word: string; forms?: string[] };
/** A glossary term found written as literal prose, with a one-click fix that
 *  swaps the occurrence for a symbolic `@id` reference — or, when an inflected
 *  form matched, for a reference written with that form. (Shared shape; the
 *  client computes these live, the server returns them for PR review.) */
export type LiteralTermFinding = {
    term: string;
    id: string;
    suggestion: string;
};
/** Per-string quality analysis: reading level (#460) and glossary symbolization,
 *  plus an optional English back-translation for PR review. */
export type StringAnalysis = {
    /** The locale path of the analyzed string. */
    key: string;
    /** True if the string reads above a ~6th-grade level. */
    complex: boolean;
    /** One short English sentence on why / how to simplify, or '' if fine. */
    readingLevelNote: string;
    /** Genuine literal-glossary-term findings (LLM-judged). */
    literalTerms: LiteralTermFinding[];
    /** English back-translation, present only when requested (PR review). */
    backTranslation?: string;
};
/** Analyze locale strings for reading level + glossary symbolization. The
 *  caller supplies the locale's glossary words (submitLocalization: from the
 *  fetched locale JSON) so the core never imports from src/. Returns one
 *  analysis per input string, or null on failure. */
export type AnalyzeLocalizationInputs = {
    /** The locale being analyzed, e.g. 'es-MX'. */
    locale: string;
    /** The locale to back-translate into, e.g. 'en-US'. */
    sourceLocale: string;
    /** The strings to analyze, in order. */
    strings: { key: string; text: string }[];
    /** The locale's glossary words for the literal-term check (empty to skip). */
    glossary: GlossaryWord[];
    /** Whether to also produce an English back-translation per string. */
    backTranslate: boolean;
};
export type AnalyzeLocalizationOutput = StringAnalysis[] | null;

export type CreateClassInputs = {
    /** The uid of the teacher that should be the curator of the gallery created. */
    teacher: string;
    /** The name of the class */
    name: string;
    /** The description fo the class */
    description: string;
    /** Existing student uids to add */
    existing: string[];
    /** Information for the student accounts */
    students: {
        username: string;
        password: string;
        meta: string[];
    }[];
};

// FUNCTION createClass
export type CreateClassError = {
    kind: 'account' | 'limit' | 'generic';
    info: string;
};
export type CreateClassOutput = {
    /** The ID of the class created */
    classid: string | undefined;
    /** Any errors returned by the function */
    error: undefined | CreateClassError;
};

// FUNCTION moderateProject
/** One moderator decision recorded against a creator (#193). */
export type Strike = {
    /** The project that was reviewed. */
    project: string;
    /** Which guidelines it broke, by flag name. */
    flags: string[];
    /** The moderator who decided. */
    moderator: string;
    /** When, in epoch milliseconds. */
    time: number;
};

/**
 * A creator's moderation record, at `strikes/{uid}`.
 *
 * Server-written and client-readable, like `usage/{uid}` — a creator who could
 * write this could clear their own strikes. The client reads it to explain why
 * public sharing is unavailable and to raise the notification; enforcement
 * itself is the `banned` custom claim, which costs no document reads in the
 * security rules.
 */
export type Strikes = {
    v: 1;
    /** How many times this creator has been found to have broken the rules. */
    count: number;
    /** Each decision, oldest first. */
    strikes: Strike[];
    /** Whether they've lost the ability to make anything public. */
    banned: boolean;
    /** When that happened, in epoch milliseconds, or null if it hasn't. */
    bannedAt: number | null;
};

/** What `moderateProject` is called with. */
export type ModerateProjectInputs = {
    /** The project being decided on. */
    project: string;
    /** The flag states to write, by flag name. */
    flags: Record<string, boolean | null>;
    /** Whether this decision counts as a strike against the project's owner.
     *  False for a decision that clears a project, and for a report dismissed
     *  as unfounded. */
    strike: boolean;
};

/** What it answers with: the owner's record after the decision, so the
 *  moderator sees the consequence they just caused. */
export type ModerateProjectOutput = {
    count: number;
    banned: boolean;
};
