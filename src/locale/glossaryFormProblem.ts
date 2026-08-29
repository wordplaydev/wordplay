import { MachineTranslated, Revised, Unwritten } from '@locale/Annotations';
import { foldGlossaryForm } from '@locale/Glossary';
import { withoutAnnotations } from '@locale/withoutAnnotations';

/**
 * What is wrong with a glossary form — the extra written forms (plurals,
 * conjugations, synonyms) a `@reference` to a term may use. Shared by the
 * locale verifier, which turns each into a log message, and the localization
 * workspace's glossary editor, which turns each into a message beside the field
 * so a translator hears about it before submitting rather than from CI after.
 */
export type GlossaryFormProblem =
    /** Carries a write-status annotation, so tooling touched a field each
     *  locale writes for itself. */
    | { kind: 'annotated' }
    /** Nothing but annotations and whitespace. */
    | { kind: 'empty' }
    /** The term's own word or id, which already resolves. */
    | { kind: 'own' }
    /** Another term's word or id, so a reference would be ambiguous. */
    | { kind: 'other'; owner: string }
    /** A documented concept's name or a reserved namespace, which wins. */
    | { kind: 'concept' }
    /** Already a form of another term. */
    | { kind: 'claimed'; owner: string }
    /** Contains something a reference can't include, so it only helps search. */
    | { kind: 'unreferenceable' };

/** The namespaces a reference resolves to before any glossary form is
 *  considered, so a form spelled like one could never match (see
 *  `ConceptLink.parse`). */
export const ReservedNamespaces = ['ui', 'how', 'u'];

/** A form that can actually be written as a reference: a reference's name run
 *  ends at a space or an operator, so anything outside letters, combining marks
 *  (Devanagari matras and the like), and numbers can't be referenced. Space and
 *  hyphen are tolerated, since such a form still earns its place in search and
 *  in the literal-word check. */
export const Referenceable = /^[\p{L}\p{M}\p{N} -]+$/u;

/** What a form is checked against: every term's folded word and id, the folded
 *  names a reference resolves before forms, and the forms already claimed. */
export type GlossaryFormContext = {
    /** Folded word or id → the term it names. */
    words: ReadonlyMap<string, string>;
    /** Folded concept ids and reserved namespaces. */
    reserved: ReadonlySet<string>;
    /** Folded form → the term that claimed it first. */
    claimed: ReadonlyMap<string, string>;
};

/** Every term's folded word and id, mapped to the term. Takes the glossary
 *  entries rather than a `LocaleText` so a caller checking a draft can pass one
 *  it assembled itself. */
export function getGlossaryWordIndex(
    glossary: Record<string, { word: string }>,
): Map<string, string> {
    const words = new Map<string, string>();
    for (const [id, entry] of Object.entries(glossary)) {
        words.set(foldGlossaryForm(entry.word), id);
        words.set(foldGlossaryForm(id), id);
    }
    return words;
}

/** The folded names a reference resolves before any form is considered. The
 *  concept ids are passed in rather than imported, since `ConceptLink` imports
 *  `Glossary` and a dependency the other way would be a cycle. */
export function getReservedFormNames(
    conceptIds: Iterable<string>,
): Set<string> {
    return new Set(
        [...conceptIds, ...ReservedNamespaces].map(foldGlossaryForm),
    );
}

/** Whether a form carries a write-status annotation, which would mean tooling
 *  translated a field that each locale writes for itself. */
export function hasWriteStatus(form: string): boolean {
    return [Unwritten, Revised, MachineTranslated].some((annotation) =>
        form.includes(annotation),
    );
}

/**
 * Every problem with one form, in the order the verifier reports them. The
 * annotation check is separate from the rest, so one form can have two
 * problems; an empty form reports only that, and `drop` says so, since it is
 * neither kept nor allowed to claim its spelling.
 */
export function checkGlossaryForm(
    id: string,
    form: string,
    context: GlossaryFormContext,
): {
    /** The form with annotations stripped and trimmed — what a caller keeps. */
    word: string;
    /** The folded spelling, for claiming. */
    folded: string;
    problems: GlossaryFormProblem[];
    /** True when the form is empty, so it is dropped rather than kept. */
    drop: boolean;
} {
    const problems: GlossaryFormProblem[] = [];
    if (hasWriteStatus(form)) problems.push({ kind: 'annotated' });

    const word = withoutAnnotations(form);
    if (word.length === 0) {
        problems.push({ kind: 'empty' });
        return { word, folded: '', problems, drop: true };
    }

    const folded = foldGlossaryForm(word);
    const owner = context.words.get(folded);
    const claimer = context.claimed.get(folded);
    if (owner === id) problems.push({ kind: 'own' });
    else if (owner !== undefined) problems.push({ kind: 'other', owner });
    else if (context.reserved.has(folded)) problems.push({ kind: 'concept' });
    else if (claimer !== undefined)
        problems.push({ kind: 'claimed', owner: claimer });
    else if (!Referenceable.test(word))
        problems.push({ kind: 'unreferenceable' });

    return { word, folded, problems, drop: false };
}
