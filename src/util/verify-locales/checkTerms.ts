import type LocaleText from '@locale/LocaleText';
import { getAllDeclaredInputNames } from '@locale/templateInputs';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import type Log from '@util/verify-locales/Log';

/** A valid term key: Unicode letters and numbers, starting with a letter.
 *  `$name` mentions accept any letter/number run, but an all-digit key would
 *  collide with legacy positional refs (`$1`) and the tuple-index override
 *  convention (`path.0`), so require a leading letter. */
const VALID_TERM_KEY = /^\p{L}[\p{L}\p{N}]*$/u;

/**
 * Validate a locale's per-locale word list (`terms`):
 *  - each key is an alphanumeric identifier (so `$key` tokenizes as a mention),
 *  - no key collides with any declared template input name (the core guarantee
 *    that lets a `$name` reference resolve unambiguously to a term or an input),
 *  - no phrase itself references a term (`$otherkey`), which keeps substitution a
 *    single, order-independent, idempotent pass. Authors write `$$` for a
 *    literal `$`.
 *
 * Terms are per-locale original content (like `guidance`), so there is no
 * en-US parity check and nothing to repair — problems are reported, not fixed.
 */
export default function checkTerms(log: Log, target: LocaleText): void {
    const terms = target.terms;
    if (terms === undefined) return;

    const inputNames = getAllDeclaredInputNames();
    const keys = Object.keys(terms);
    const keySet = new Set(keys);

    for (const key of keys) {
        if (!VALID_TERM_KEY.test(key))
            log.bad(
                2,
                `Term key "${key}" is not a valid identifier; term keys must start with a letter and use only letters and numbers (any language) so they can be referenced as $${key}.`,
            );

        if (inputNames.has(key))
            log.bad(
                2,
                `Term key "${key}" collides with a template input name; a $${key} reference would be ambiguous. Rename the term.`,
            );

        // A phrase that references any term key would make substitution depend
        // on how many passes run over it; forbid it so a single pass suffices.
        const phrase = withoutAnnotations(terms[key]);
        for (const match of phrase.matchAll(/(?<!\$)\$([\p{L}\p{N}]+)/gu))
            if (keySet.has(match[1]))
                log.bad(
                    2,
                    `Term "${key}" references another term $${match[1]} in its phrase; terms can't be defined in terms of other terms. Inline the phrase, or write $$ for a literal $.`,
                );
    }
}
