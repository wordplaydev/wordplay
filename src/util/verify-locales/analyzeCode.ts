import type LocaleText from '#locale/LocaleText.ts';
import { toLocaleString } from '#locale/LocaleText.ts';
import Project from '#db/projects/Project.ts';
import Source from '#nodes/Source.ts';

/**
 * Cache of code conflict-analysis results, keyed by locale + source code. Tutorial snippets are
 * overwhelmingly shared across locales (translators change the dialog, not the code), so within a
 * locale this still dedups heavily; without it the verifier would re-run `Project.analyze`
 * thousands of times per pass. The key includes the locale because the same code can analyze
 * differently per locale (a name that resolves in one locale's basis may not in another), so a
 * code-only key would let a broken localized program slip through under a sibling's clean result.
 *
 * The cached value is the analysis output, not the Project — Projects are heavy and we don't need
 * them after extracting conflicts.
 */
export type AnalyzeResult = { conflicts: string[]; error: string | undefined };
const analyzeCache = new Map<string, AnalyzeResult>();

/** Build a throwaway project from the code, analyze it, and return its conflicts (or an error). */
export default function analyzeCode(
    code: string,
    locale: LocaleText,
): AnalyzeResult {
    // A NUL separates the two halves because no locale name or program text can
    // contain one, so no pair of them can collide. Written as an escape rather
    // than a literal byte: a raw NUL makes git treat the file as binary and stop
    // diffing it.
    const key = `${toLocaleString(locale)}\0${code}`;
    const cached = analyzeCache.get(key);
    if (cached) return cached;
    let result: AnalyzeResult;
    try {
        const project = Project.make(
            null,
            'test',
            new Source('start', code),
            [],
            locale,
        );
        result = {
            conflicts: Array.from(project.analyze().conflictedNodes.values())
                .flat()
                .map((c) => c.toString()),
            error: undefined,
        };
    } catch (error) {
        result = { conflicts: [], error: String(error) };
    }
    analyzeCache.set(key, result);
    return result;
}
