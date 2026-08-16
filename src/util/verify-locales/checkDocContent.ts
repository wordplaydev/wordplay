/**
 * The two checks every piece of documentation has to pass, wherever it lives:
 * every `@reference` resolves, and every example analyzes without conflicts.
 *
 * Locale docs, tutorial dialog, and how-tos are three different file formats
 * that all hold the same markup, and each used to decide for itself what
 * "valid" meant — which is how how-to bodies ended up checked by nothing at
 * all. Deciding it once here means a rule can't hold in one place and lapse in
 * another, and callers are left with only the part that genuinely differs:
 * how to describe where the problem is, and how loudly to complain.
 */

import type LocaleText from '@locale/LocaleText';
import { parseLocaleDoc } from '@locale/LocaleText';
import ConceptLink from '@nodes/ConceptLink';
import analyzeCode from '@util/verify-locales/analyzeCode';
import getDocExamples, {
    type DocExample,
} from '@util/verify-locales/docExamples';

export type DocProblem =
    /** References that don't resolve to any concept, glossary term, or character. */
    | { kind: 'references'; links: string[] }
    /** An example the analyzer couldn't even build a project from. */
    | { kind: 'unanalyzable'; example: DocExample; error: string }
    /** An example that builds but has conflicts in it. */
    | { kind: 'conflicts'; example: DocExample; conflicts: string[] };

/**
 * Every problem in one doc, in reporting order.
 *
 * Two kinds of example are left alone.
 *
 * A **single-token** example isn't analyzed at all. Naming one thing mid-sentence
 * — `\tempo\`, `\count\`, `\pitch\` — is prose formatted as code, not a program
 * anyone could run, and analyzing it only ever reports the obvious (`UnknownName`
 * on a bare name). Requiring an author to annotate that was a rule to remember
 * for no benefit: the marker isn't even rendered to readers. Two or more tokens
 * could be a real expression, so those are still checked.
 *
 * An example annotated 🪲 is also skipped: that marker is how a doc says the
 * mistake is the point, for the cases the token rule doesn't cover — a binding
 * with nothing to bind to (`\hi: 5\🪲`), or a deliberate type error
 * (`\1cat + 1dog\🪲`).
 *
 * `include` lets a caller narrow which examples are its business — how-tos use
 * it to reach examples that translation has flattened out of shape.
 */
export default function checkDocContent(
    doc: string,
    locale: LocaleText,
    include?: (example: DocExample, index: number) => boolean,
): DocProblem[] {
    const problems: DocProblem[] = [];

    const broken = parseLocaleDoc(doc)
        .nodes()
        .filter(
            (node): node is ConceptLink =>
                node instanceof ConceptLink && node.isBroken(locale),
        );
    if (broken.length > 0)
        problems.push({
            kind: 'references',
            links: broken.map((link) => link.toWordplay()),
        });

    getDocExamples(doc).forEach((example, index) => {
        if (example.expectsDefect || example.tokens <= 1) return;
        if (include !== undefined && !include(example, index)) return;
        const result = analyzeCode(example.code, locale);
        if (result.error !== undefined)
            problems.push({
                kind: 'unanalyzable',
                example,
                error: result.error,
            });
        else if (result.conflicts.length > 0)
            problems.push({
                kind: 'conflicts',
                example,
                conflicts: result.conflicts,
            });
    });

    return problems;
}
