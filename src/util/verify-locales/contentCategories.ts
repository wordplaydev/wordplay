// Content-category targeting for translate/override runs. A run does five kinds
// of work per locale (locale strings, complete tutorial, quick tutorial,
// how-tos, emoji); these flags scope which run.
//
//   (no flags)        do everything (default)
//   -<category> …     exclude whole categories; do everything else
//   +<category> …     include only these categories
//   +<category>:<spec> include only specific sub-content (repeat to add more)
//
// Specifiers (include only): locale:<path-prefix>, tutorial:<act>[/<scene>],
// quick:<act>[/<scene>] (1-based), howto:<id>. Mixing +/-, a specifier on a -
// flag or on emoji, an unknown category, or a malformed specifier are errors.

export const CONTENT_CATEGORIES = [
    'locale',
    'tutorial',
    'quick',
    'howto',
    'emoji',
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
        if (category === 'emoji')
            return `"emoji" takes no specifier: "${token}".`;
        if (specifier.length === 0)
            return `Empty specifier in "${token}".`;
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

    const mode = !hasInclude && !hasExclude ? 'all' : hasInclude ? 'include' : 'exclude';
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
            return mode === 'include' ? listed.has(category) : !listed.has(category);
        },
        localePrefixes: () => specifiersOf('locale'),
        tutorialTargets: () => targetsOf('tutorial'),
        quickTargets: () => targetsOf('quick'),
        howtoIds: () => specifiersOf('howto'),
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
