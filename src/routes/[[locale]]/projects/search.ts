/**
 * Shared search utility for searching Wordplay projects by name, source file
 * name, text literals, formatted literal segments, and documentation.
 */

import type Project from '@db/projects/Project';
import type Locales from '@locale/Locales';
import type Source from '@nodes/Source';
import Doc from '@nodes/Doc';
import FormattedTranslation from '@nodes/FormattedTranslation';
import Translation from '@nodes/Translation';
import Words from '@nodes/Words';
import Fuse, { type FuseResult, type IFuseOptions } from 'fuse.js';

export type SearchableSource = {
    /** The preferred display name of the source file */
    name: string;
    /** Flat concatenation of text literals, formatted text segments, and doc text */
    code: string;
};

export type SearchableProject = {
    project: Project;
    name: string;
    sources: SearchableSource[];
};

/** A project returned from search, with an optional snippet when the match was in source code. */
export type ProjectMatch = {
    project: Project;
    /**
     * A short excerpt of the matching source text, present when the match was
     * not on the project name (e.g. a text literal, formatted segment, or doc).
     * Undefined when the match was purely on the project name.
     */
    matchText?: string;
};

export const FUSE_OPTIONS: IFuseOptions<SearchableProject> = {
    includeScore: true,
    includeMatches: true,
    threshold: 0.4,
    ignoreLocation: true,
    keys: ['name', 'sources.name', 'sources.code'],
};

/**
 * Extracts searchable text from a source's AST:
 * - Text literal content (Translation nodes)
 * - Formatted literal segments (FormattedTranslation markup words)
 * - Documentation (Doc markup words)
 */
export function extractSourceText(source: Source): string {
    const parts: string[] = [];
    const expression = source.expression;

    // Text literals: 'hello' — extract segment text with escapes resolved
    for (const t of expression.nodes(
        (n): n is Translation => n instanceof Translation,
    )) {
        const text = t.getText();
        if (text) parts.push(text);
    }

    // Formatted literals: •hello *world*• — extract all Words text from markup
    for (const ft of expression.nodes(
        (n): n is FormattedTranslation => n instanceof FormattedTranslation,
    )) {
        const text = ft.markup
            .nodes((n): n is Words => n instanceof Words)
            .map((w) => w.toText())
            .join(' ');
        if (text) parts.push(text);
    }

    // Documentation blocks: `⁋ explains something ⁋` — extract all Words text
    for (const doc of expression.nodes((n): n is Doc => n instanceof Doc)) {
        const text = doc.markup
            .nodes((n): n is Words => n instanceof Words)
            .map((w) => w.toText())
            .join(' ');
        if (text) parts.push(text);
    }

    return parts.join(' ');
}

/** Creates a Fuse.js-searchable representation of a project. */
export function toSearchable(
    project: Project,
    locales: Locales,
): SearchableProject {
    return {
        project,
        name: project.getName(),
        sources: project.getSources().map((source) => ({
            name: source.getPreferredName(locales.getLocales()),
            code: extractSourceText(source),
        })),
    };
}

/**
 * Characters of context to show on each side of a matched range in source code.
 * Chosen to fit comfortably within a single line in the UI.
 */
const SNIPPET_CONTEXT = 40;

/**
 * Given a Fuse result, extracts a short excerpt around the best non-name match.
 * Returns undefined when the match was on the project name (already highlighted in the UI).
 * Returns the source file name verbatim when the match was on a file name.
 * Returns a clipped excerpt with ellipsis for matches inside source code text.
 */
function matchSnippet(
    result: FuseResult<SearchableProject>,
): string | undefined {
    // Skip if Fuse didn't report match details or every match was on the name
    const sourceMatch = result.matches?.find(
        (m) => m.key !== 'name' && m.value && m.indices?.length,
    );
    if (!sourceMatch) return undefined;

    const value = sourceMatch.value!;
    const [start, end] = sourceMatch.indices[0];

    // For a source file name match, just return the name as-is
    if (sourceMatch.key === 'sources.name') return value;

    // For a source code match, clip a window around the matched range
    const snippetStart = Math.max(0, start - SNIPPET_CONTEXT);
    const snippetEnd = Math.min(value.length, end + SNIPPET_CONTEXT + 1);
    const prefix = snippetStart > 0 ? '…' : '';
    const suffix = snippetEnd < value.length ? '…' : '';
    return prefix + value.slice(snippetStart, snippetEnd).trim() + suffix;
}

/**
 * Searches a list of projects using Fuse.js fuzzy matching against:
 * project name, source file names, text literals, formatted text, and docs.
 *
 * Returns `ProjectMatch[]` in match-quality order, each with an optional
 * `matchText` snippet when the match was inside the source code rather than
 * the project name. Returns the full list (no snippets) when term is empty.
 */
export function searchProjects(
    projects: Project[],
    term: string,
    locales: Locales,
): ProjectMatch[] {
    if (!term.trim()) return projects.map((project) => ({ project }));
    const searchable = projects.map((p) => toSearchable(p, locales));
    const fuse = new Fuse(searchable, FUSE_OPTIONS);
    return fuse.search(term).map((result) => {
        const matchText = matchSnippet(result);
        return matchText !== undefined
            ? { project: result.item.project, matchText }
            : { project: result.item.project };
    });
}
