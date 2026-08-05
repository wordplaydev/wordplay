import { MachineTranslated, Revised, Unwritten } from '@locale/Annotations';
import { foldGlossaryForm } from '@locale/Glossary';
import type LocaleText from '@locale/LocaleText';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import { ReservedConceptIDs } from '@nodes/ConceptLink';
import type Log from '@util/verify-locales/Log';

/** The namespaces a reference resolves to before any glossary form is
 *  considered, so a form spelled like one could never match (see
 *  `ConceptLink.parse`). */
const RESERVED_NAMESPACES = ['ui', 'how', 'u'];

/** A form that can actually be written as a reference: a reference's name run
 *  ends at a space or an operator, so anything outside letters, combining marks
 *  (Devanagari matras and the like), and numbers can't be referenced. Space and
 *  hyphen are tolerated, since such a form still earns its place in search and
 *  in the literal-word check. */
const REFERENCEABLE = /^[\p{L}\p{M}\p{N} -]+$/u;

/**
 * Validate a locale's glossary forms — the extra written forms (plurals,
 * conjugations, synonyms) a `@reference` to a term may use.
 *
 * Forms are per-locale original content (like `terms` and `guidance`), so there
 * is no en-US parity check. Collisions are reported rather than repaired, since
 * choosing which side to rename needs a human; only the two cases with exactly
 * one right answer — an empty form, and a stray write-status annotation, which
 * means tooling touched a field it shouldn't — are fixed. A form that an earlier
 * step of `ConceptLink.parse` would claim (a concept id, a glossary word or id,
 * a reserved namespace) is dead, and an error rather than a warning: it
 * silently does nothing, and misleads whoever reads the locale.
 */
export default function checkGlossaryForms(
    log: Log,
    target: LocaleText,
    fix: boolean,
): LocaleText {
    const revised = fix
        ? (JSON.parse(JSON.stringify(target)) as LocaleText)
        : target;

    // Folded canonical words and ids, for the collision checks.
    const words = new Map<string, string>();
    for (const [id, entry] of Object.entries(target.glossary)) {
        words.set(foldGlossaryForm(entry.word), id);
        words.set(foldGlossaryForm(id), id);
    }
    const concepts = new Set(
        [...ReservedConceptIDs, ...RESERVED_NAMESPACES].map(foldGlossaryForm),
    );
    /** Folded form → the term that claimed it first. */
    const claimed = new Map<string, string>();

    for (const [id, entry] of Object.entries(revised.glossary)) {
        const forms = entry.forms;
        if (forms === undefined) continue;

        const keep: string[] = [];
        for (const form of forms) {
            if (hasAnnotation(form))
                log.bad(
                    `Glossary form "${form}" of term "${id}" has a write-status annotation; each locale writes its own forms, so they are never translated and carry no status.`,
                );

            const word = withoutAnnotations(form);
            if (word.length === 0) {
                log.bad(`Glossary term "${id}" has an empty form; remove it.`);
                continue;
            }

            const folded = foldGlossaryForm(word);
            const owner = words.get(folded);
            if (owner === id)
                log.bad(
                    `Glossary form "${word}" of term "${id}" is the term's own word or id, which already resolves, so the form does nothing.`,
                );
            else if (owner !== undefined)
                log.bad(
                    `Glossary form "${word}" of term "${id}" is the word or id of term "${owner}", so a reference to it would be ambiguous.`,
                );
            else if (concepts.has(folded))
                log.bad(
                    `Glossary form "${word}" of term "${id}" is a documented concept's name, so a reference to it resolves to the concept and the form does nothing.`,
                );
            else if (claimed.has(folded))
                log.bad(
                    `Glossary form "${word}" of term "${id}" is already a form of term "${claimed.get(folded)}", so a reference to it would be ambiguous.`,
                );
            else if (!REFERENCEABLE.test(word))
                log.warning(
                    `Glossary form "${word}" of term "${id}" contains something a reference can't include, so it will only help search; use letters, numbers, spaces, and hyphens.`,
                );

            if (!claimed.has(folded)) claimed.set(folded, id);
            keep.push(word);
        }

        if (
            fix &&
            (keep.length !== forms.length ||
                keep.some((form, index) => form !== forms[index]))
        ) {
            if (keep.length > 0) entry.forms = keep;
            else delete entry.forms;
        }
    }

    return revised;
}

/** Whether a form carries a write-status annotation, which would mean tooling
 *  translated a field that each locale writes for itself. */
function hasAnnotation(form: string): boolean {
    return [Unwritten, Revised, MachineTranslated].some((annotation) =>
        form.includes(annotation),
    );
}
