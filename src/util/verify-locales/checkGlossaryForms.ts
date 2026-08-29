import {
    checkGlossaryForm,
    getGlossaryWordIndex,
    getReservedFormNames,
} from '@locale/glossaryFormProblem';
import type LocaleText from '@locale/LocaleText';
import { ReservedConceptIDs } from '@nodes/ConceptLink';
import type Log from '@util/verify-locales/Log';

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
 *
 * The rules themselves live in `@locale/glossaryFormProblem`, shared with the
 * localization workspace's glossary editor so a translator is told about a
 * collision as they type rather than by a red pull request.
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
    const words = getGlossaryWordIndex(target.glossary);
    const reserved = getReservedFormNames(ReservedConceptIDs);
    /** Folded form → the term that claimed it first. */
    const claimed = new Map<string, string>();

    for (const [id, entry] of Object.entries(revised.glossary)) {
        const forms = entry.forms;
        if (forms === undefined) continue;

        const keep: string[] = [];
        for (const form of forms) {
            const { word, folded, problems, drop } = checkGlossaryForm(
                id,
                form,
                { words, reserved, claimed },
            );
            for (const problem of problems) {
                switch (problem.kind) {
                    case 'annotated':
                        log.bad(
                            `Glossary form "${form}" of term "${id}" has a write-status annotation; each locale writes its own forms, so they are never translated and carry no status.`,
                        );
                        break;
                    case 'empty':
                        log.bad(
                            `Glossary term "${id}" has an empty form; remove it.`,
                        );
                        break;
                    case 'own':
                        log.bad(
                            `Glossary form "${word}" of term "${id}" is the term's own word or id, which already resolves, so the form does nothing.`,
                        );
                        break;
                    case 'other':
                        log.bad(
                            `Glossary form "${word}" of term "${id}" is the word or id of term "${problem.owner}", so a reference to it would be ambiguous.`,
                        );
                        break;
                    case 'concept':
                        log.bad(
                            `Glossary form "${word}" of term "${id}" is a documented concept's name, so a reference to it resolves to the concept and the form does nothing.`,
                        );
                        break;
                    case 'claimed':
                        log.bad(
                            `Glossary form "${word}" of term "${id}" is already a form of term "${problem.owner}", so a reference to it would be ambiguous.`,
                        );
                        break;
                    case 'unreferenceable':
                        log.warning(
                            `Glossary form "${word}" of term "${id}" contains something a reference can't include, so it will only help search; use letters, numbers, spaces, and hyphens.`,
                        );
                        break;
                }
            }
            if (drop) continue;

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
