/**
 * Search Wordplay projects by name, source file name, text literals, formatted
 * literal segments, and documentation, using the shared search policy in
 * src/util/search.ts. The project name ranks above source file names, which rank
 * above source code text; a match inside source text comes back with a short
 * excerpt snippet.
 */

import type Project from '@db/projects/Project';
import { parseAsMultilingualName } from '@db/projects/getLocalizedProjectName';
import type Locales from '@locale/Locales';
import type Source from '@nodes/Source';
import Doc from '@nodes/Doc';
import FormattedTranslation from '@nodes/FormattedTranslation';
import Translation from '@nodes/Translation';
import Words from '@nodes/Words';
import {
    excerpt,
    foldEntry,
    searchItems,
    type Searchable,
    type SearchField,
    type SearchLanguages,
} from '@util/search';

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

/** Priority tiers: project name beats file names beats source code text. */
const NAME = 1;
const FILE = 2;
const CODE = 3;

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

/** Builds the prioritized search fields for a project. */
export function projectSearchFields(
    name: string,
    fileNames: string[],
    codeBlobs: string[],
    languages: SearchLanguages,
): SearchField[] {
    const fields: SearchField[] = [
        { entries: [foldEntry(name, languages)], priority: NAME },
    ];
    const files = fileNames
        .filter((n) => n.length > 0)
        .map((n) => foldEntry(n, languages));
    if (files.length > 0) fields.push({ entries: files, priority: FILE });
    const codes = codeBlobs
        .filter((c) => c.trim().length > 0)
        .map((c) => foldEntry(c, languages));
    if (codes.length > 0) fields.push({ entries: codes, priority: CODE });
    return fields;
}

/** Creates a searchable record for a project. */
export function toSearchable(
    project: Project,
    languages: SearchLanguages,
): Searchable<Project> {
    // For multilingual project names (Wordplay TextLiteral source, e.g.
    // `"hi"/en"hola"/es`), flatten every translation into the searchable string
    // so a user typing "hola" still matches even when the active locale is
    // English. Plain names search as-is (#456).
    const raw = project.getName();
    const parsed = parseAsMultilingualName(raw);
    const name = parsed ? parsed.texts.map((t) => t.getText()).join(' ') : raw;
    const sources = project.getSources();
    return {
        ref: project,
        fields: projectSearchFields(
            name,
            // All language variants of each source's name, so a multilingual
            // file name matches in any selected locale (not just the preferred).
            sources.flatMap((s) => s.getNames()),
            sources.map((s) => extractSourceText(s)),
            languages,
        ),
    };
}

/**
 * Searches a list of projects, returning `ProjectMatch[]` in match-quality
 * order. Each match carries an optional `matchText` snippet when the match was
 * inside source text rather than the project name. Returns the full list (no
 * snippets) when the term is empty.
 */
export function searchProjects(
    projects: Project[],
    term: string,
    locales: Locales,
): ProjectMatch[] {
    if (!term.trim()) return projects.map((project) => ({ project }));
    const languages = locales.getLanguages();
    const records = projects.map((p) => toSearchable(p, languages));
    return searchItems(records, term, languages).map(
        ([project, [display, start, end, priority]]) =>
            priority === NAME
                ? { project }
                : { project, matchText: excerpt(display, start, end) },
    );
}
