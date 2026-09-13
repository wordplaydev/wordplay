// Content-category targeting for translate/override runs. A run does eight
// kinds of work per locale (locale strings, complete tutorial, quick tutorial,
// how-tos, gallery examples, changelog entries, emoji, date/time data); these
// flags scope which run.
//
//   (no flags)        do everything (default)
//   -<category> …     exclude whole categories; do everything else
//   +<category> …     include only these categories
//   +<category>:<spec> include only specific sub-content (repeat to add more)
//
// The two signs scope different amounts. A `-` flag scopes **translation** — the
// category is still verified and repaired, it just isn't paid for. A `+` flag scopes
// the **whole step**: a run that names categories does those and nothing else, so a
// kits-only child doesn't re-verify the locale file, both tutorials, and 75 examples
// that the run's other children already did. `isIncluded` answers the first question
// and `isNarrowedOut` the second; `stepsFor` turns the second into the per-step policy.
//
// Specifiers (include only): locale:<path-prefix>, tutorial:<act>[/<scene>],
// quick:<act>[/<scene>] (1-based), howto:<id>, example:<Name>,
// changelog:<version>. Mixing +/-, a specifier on a - flag or on
// emoji/datetimes, an unknown category, or a malformed specifier are errors.

export const CONTENT_CATEGORIES = [
    'locale',
    'tutorial',
    'quick',
    'howto',
    'example',
    'kit',
    'changelog',
    'emoji',
    'datetimes',
] as const;
export type ContentCategory = (typeof CONTENT_CATEGORIES)[number];

/** An act (optionally a scene within it), 1-based, targeting a tutorial. */
export type TutorialTarget = { act: number; scene?: number };

export type Selection = {
    /** Whether a category runs at all under this selection. */
    isIncluded(category: ContentCategory): boolean;
    /** LocalePath prefixes to narrow `locale` to (empty = whole category). */
    localePrefixes(): string[];
    /** Acts/scenes to narrow the complete tutorial to (empty = whole). */
    tutorialTargets(): TutorialTarget[];
    /** Acts/scenes to narrow the quick tutorial to (empty = whole). */
    quickTargets(): TutorialTarget[];
    /** How-to ids to narrow `howto` to (empty = whole category). */
    howtoIds(): string[];
    /** Example names to narrow `example` to (empty = whole category). */
    exampleIds(): string[];
    /** Kit names to narrow `kit` to (empty = whole category). */
    kitIds(): string[];
    /** Release versions to narrow `changelog` to (empty = whole category). */
    changelogVersions(): string[];
    /** Whether the category was named with a `+` flag, as opposed to merely
     *  riding along with a no-flag or exclude run. Gallery examples are opt-in
     *  per locale, and an explicit `+example` is what opts a locale in. */
    isExplicitlyIncluded(category: ContentCategory): boolean;
    /** Whether this run *named* categories and this isn't one of them — the gate
     *  on whether a step runs at all, as opposed to `isIncluded`, which gates
     *  only whether it pays for translation. False for every category under a
     *  no-flag or `-`-only run, which is what keeps `npm run locales`,
     *  `locales-fix`, and the batch's `-kit` children unchanged. Deliberately
     *  not `!isIncluded`: under `-kit`, `isIncluded('kit')` is false but the run
     *  must still verify kits. */
    isNarrowedOut(category: ContentCategory): boolean;
    /** The raw `+`/`-` flag tokens, for forwarding to child processes. */
    flags: string[];
};

type ParsedFlag = {
    sign: '+' | '-';
    category: ContentCategory;
    specifier?: string;
};

function isContentCategory(value: string): value is ContentCategory {
    return (CONTENT_CATEGORIES as readonly string[]).includes(value);
}

/** A token is a category flag if it starts with a single `+`/`-` and a letter
 *  (so `--jobs`, locale names, and the jobs value are not flags). */
function isCategoryFlag(token: string): boolean {
    return /^[+-][a-z]/.test(token);
}

/** Parse `<act>` or `<act>/<scene>` (1-based) into a target, or undefined. */
function parseTutorialTarget(spec: string): TutorialTarget | undefined {
    const parts = spec.split('/');
    if (parts.length > 2) return undefined;
    const nums = parts.map((p) => Number(p));
    if (!nums.every((n) => Number.isInteger(n) && n >= 1)) return undefined;
    return parts.length === 2
        ? { act: nums[0], scene: nums[1] }
        : { act: nums[0] };
}

/** Parse one `[+-]category[:specifier]` token into a flag, or an error string. */
function parseFlag(token: string): ParsedFlag | string {
    const sign = token[0] === '+' ? '+' : '-';
    const body = token.slice(1);
    const colon = body.indexOf(':');
    const category = colon === -1 ? body : body.slice(0, colon);
    const specifier = colon === -1 ? undefined : body.slice(colon + 1);

    if (!isContentCategory(category))
        return `Unknown content category "${category}". Use one of: ${CONTENT_CATEGORIES.join(', ')}.`;
    if (specifier !== undefined) {
        if (sign === '-')
            return `A specifier is only valid with + (include): "${token}".`;
        if (category === 'emoji' || category === 'datetimes')
            return `"${category}" takes no specifier: "${token}".`;
        if (specifier.length === 0) return `Empty specifier in "${token}".`;
        if (
            (category === 'tutorial' || category === 'quick') &&
            parseTutorialTarget(specifier) === undefined
        )
            return `Invalid ${category} target "${specifier}" — use <act> or <act>/<scene> (1-based).`;
    }
    // Omit specifier when absent (exactOptionalPropertyTypes rejects an explicit undefined).
    return specifier === undefined
        ? { sign, category }
        : { sign, category, specifier };
}

/** Parse all `+`/`-` flags out of `args` (other tokens — locales, --jobs — are
 *  ignored) into a Selection, or return a usage-error string. */
export function parseCategorySelection(args: string[]): Selection | string {
    const flags = args.filter(isCategoryFlag);
    const parsed: ParsedFlag[] = [];
    for (const token of flags) {
        const flag = parseFlag(token);
        if (typeof flag === 'string') return flag;
        parsed.push(flag);
    }

    const hasInclude = parsed.some((f) => f.sign === '+');
    const hasExclude = parsed.some((f) => f.sign === '-');
    if (hasInclude && hasExclude)
        return 'Cannot mix + (include) and - (exclude) category flags.';

    const mode =
        !hasInclude && !hasExclude ? 'all' : hasInclude ? 'include' : 'exclude';
    const listed = new Set(parsed.map((f) => f.category));
    const specifiersOf = (category: ContentCategory): string[] =>
        parsed
            .filter((f) => f.category === category && f.specifier !== undefined)
            .map((f) => f.specifier as string);
    const targetsOf = (category: ContentCategory): TutorialTarget[] =>
        specifiersOf(category)
            .map(parseTutorialTarget)
            .filter((t): t is TutorialTarget => t !== undefined);

    return {
        flags,
        isIncluded(category) {
            if (mode === 'all') return true;
            return mode === 'include'
                ? listed.has(category)
                : !listed.has(category);
        },
        isExplicitlyIncluded(category) {
            return mode === 'include' && listed.has(category);
        },
        isNarrowedOut(category) {
            return mode === 'include' && !listed.has(category);
        },
        localePrefixes: () => specifiersOf('locale'),
        tutorialTargets: () => targetsOf('tutorial'),
        quickTargets: () => targetsOf('quick'),
        howtoIds: () => specifiersOf('howto'),
        exampleIds: () => specifiersOf('example'),
        kitIds: () => specifiersOf('kit'),
        changelogVersions: () => specifiersOf('changelog'),
    };
}

/** Segment-aware prefix match for a dotted LocalePath string: `output.Phrase`
 *  matches `output.Phrase` and `output.Phrase.doc` but not `output.Phraser`. */
export function localePrefixMatches(
    pathString: string,
    prefix: string,
): boolean {
    return pathString === prefix || pathString.startsWith(prefix + '.');
}

/** Whether a (1-based) act/scene falls under a tutorial target. A target with no
 *  scene matches the whole act. */
export function tutorialTargetMatches(
    act: number,
    scene: number | undefined,
    target: TutorialTarget,
): boolean {
    if (target.act !== act) return false;
    return target.scene === undefined || target.scene === scene;
}

/**
 * Which of a run's per-locale and post-loop steps run at all, under this selection.
 *
 * A step runs unless its own category is narrowed out **and** every category it derives
 * content from is too: a localized example is derived from the locale's names, so a
 * `+locale` run must still re-derive it even though `example` wasn't named. The whole
 * policy lives here rather than in `start.ts`, which is module-level script code that
 * executes on import and so can't be tested; this is the move `splitKitPhase` made.
 *
 * `emoji` is deliberately absent. Its gate is `TranslationRequested &&
 * isIncluded('emoji')`, which is the right and *different* formula — generation is paid
 * work with no verification half, so `-emoji` must turn it off, and a
 * `!isNarrowedOut('emoji')` field here would turn it back on.
 */
export type RunSteps = {
    /** verifyLocale + linkGlossaryInLocale + the locale file write. */
    locale: boolean;
    /** Every tutorial mode but `quick`. */
    tutorial: boolean;
    quick: boolean;
    /** checkGlossaryWordUsage, which reads the locale *and* every tutorial. */
    glossaryUsage: boolean;
    /** verifyHowTo + buildHowToBundle. */
    howto: boolean;
    example: boolean;
    kit: boolean;
    changelog: boolean;
    datetimes: boolean;
    /** The post-loop drift marking, which spans locale and tutorial files. */
    drift: boolean;
    /** names.json, choose prompts, manifests, unused keys, untagged strings. */
    artifacts: boolean;
};

export function stepsFor(selection: Selection): RunSteps {
    const n = (category: ContentCategory) => selection.isNarrowedOut(category);
    const locale = !n('locale');
    const tutorial = !n('tutorial');
    const quick = !n('quick');
    return {
        locale,
        tutorial,
        quick,
        // A run that loaded no tutorials has no standing to call a glossary word
        // unused: the check asks whether the locale's own text uses it, and the
        // lessons are most of that text.
        glossaryUsage: locale && tutorial && quick,
        // How-tos and examples are derived content — they retarget example
        // references against names a `+locale` run may have just changed — so
        // `locale` being in scope pulls their deterministic re-derivation in even
        // when they weren't named. Without this a `+locale` rename would strand
        // them, which `exampleNamesSync` and `localizedExamplesSync` would catch
        // only in the sweep.
        howto: !n('howto') || locale,
        example: !n('example') || locale,
        // A kit translates from its own English with `examples: false`; nothing
        // about it derives from locale names.
        kit: !n('kit'),
        // Keyed by a hash of each entry's English; nothing retargets.
        changelog: !n('changelog'),
        // Generated from a pinned CLDR release; deterministic.
        datetimes: !n('datetimes'),
        drift: locale && tutorial && quick,
        // All five derive from locale strings.
        artifacts: locale,
    };
}

/**
 * The non-flag positionals in `args` — the locales a run names, in the order given.
 *
 * `[]` means "every locale, and the cross-locale steps only a whole run may take".
 * A `--`-prefixed token is an error rather than a locale: `isCategoryFlag` is
 * `/^[+-][a-z]/`, which doesn't match `--jobs`, so `start.ts translate --jobs 2 zh-CN`
 * used to take `--jobs` as the locale and translate nothing.
 */
export function parsePositionals(args: string[]): string[] | string {
    const locales: string[] = [];
    for (const arg of args) {
        if (isCategoryFlag(arg)) continue;
        if (arg.startsWith('--'))
            return `"${arg}" isn't a locale or a category flag. Pass --jobs to the batch runner, not to start.ts.`;
        locales.push(arg);
    }
    return locales;
}
