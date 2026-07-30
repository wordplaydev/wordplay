import type Locales from '@locale/Locales';
import Evaluate from '@nodes/Evaluate';
import Reference from '@nodes/Reference';
import type { Moved, OutputsByName } from '@output/animation/Animator';
import type Output from '@output/Output/Output';
import Say from '@output/Output/Say';
import Sequence from '@output/animation/Sequence';
import describeDirection, { describePlace } from './direction';

/**
 * How many changed outputs are listed individually before we summarize them
 * instead. A stream that redraws a whole scene — Camera renders every pixel as
 * a Phrase — otherwise produces a list no one could listen to (#555).
 */
export const MaxIndividualChanges = 3;

/**
 * Whether this output should be described aloud. Everything on stage should be
 * — except a Say, which speech synthesis already voices, so describing it here
 * would deliver it twice in two different voices.
 */
function describable(output: Output): boolean {
    return !(output instanceof Say);
}

/**
 * What to call an output. A creator-supplied `description` wins over the
 * generated one: they wrote it precisely so their output would be described
 * their way, and the views already honor it for their aria-labels (#555).
 */
function nameOf(output: Output, locales: Locales): string {
    return output.description?.text ?? output.getDescription(locales);
}

/** A description of output that has entered the scene, computed after still. */
export function describeEnteredOutput(
    locales: Locales,
    entered: OutputsByName,
): string | undefined {
    const descriptions = Array.from(entered.values())
        .filter(describable)
        .map((output) => nameOf(output, locales));
    // Nothing describable — a stage holding only a Say — reads as an
    // announcement of the word "new" with nothing after it, so say nothing and
    // let the caller fall through to what changed or moved.
    return descriptions.length === 0
        ? undefined
        : locales.getPrimaryPlainText((l) => l.glossary.entered.word) +
              ' ' +
              descriptions.join(', ');
}

/**
 * A description of non-entering output that changed text, computed after still.
 *
 * A handful of changes are listed individually; more than that are summarized
 * by the container holding them, since a long list of near-identical
 * descriptions conveys less than one count (#555).
 */
export function describedChangedOutput(
    locales: Locales,
    entered: OutputsByName,
    present: OutputsByName,
    previouslyPresent: OutputsByName | undefined,
    container?: Output,
): string | undefined {
    const changes: Record<string, number> = {};
    for (const [name, output] of present.entries()) {
        if (describable(output)) {
            const previous =
                previouslyPresent === undefined
                    ? undefined
                    : previouslyPresent.get(name);
            if (!entered.has(name)) {
                const previousText = previous
                    ? nameOf(previous, locales)
                    : undefined;
                const currentText = nameOf(output, locales).trim();
                if (
                    previousText !== currentText &&
                    typeof currentText === 'string'
                ) {
                    const sequence =
                        output.resting instanceof Sequence
                            ? output.resting
                            : undefined;
                    const sequenceDescription = sequence
                        ? sequence.value.creator instanceof Evaluate &&
                          sequence.value.creator.inputs[0] instanceof
                              Evaluate &&
                          sequence.value.creator.inputs[0].fun instanceof
                              Reference
                            ? sequence.value.creator.inputs[0].fun.getName()
                            : ''
                        : undefined;

                    const description =
                        currentText +
                        (sequenceDescription ? ` ${sequenceDescription}` : '');

                    changes[description] = (changes[description] ?? 0) + 1;
                }
            }
        }
    }

    // `changes` is a record, not a Map — `.size` was always undefined here, so
    // this never took the early exit (harmless only because an empty record
    // joins to '', which callers treat as "nothing changed").
    if (Object.keys(changes).length === 0) return undefined;

    const ranked = [...Object.entries(changes)].sort((a, b) => b[1] - a[1]);
    const total = ranked.reduce((sum, [, count]) => sum + count, 0);

    // Too many to list: say how many changed, where, and ONE of them as an
    // example. The example is not decoration — a bare count and container are
    // the same words every tick ("12 outputs changed in my grid"), and a
    // screen reader will not re-read a live region whose text is unchanged, so
    // a constant summary is heard once and then sounds like silence. The
    // example changes as the outputs do, which is what keeps it audible.
    if (total > MaxIndividualChanges && container !== undefined)
        return locales
            .concretize((l) => l.ui.output.manyChanged, {
                count: total,
                container: nameOf(container, locales),
                example: ranked[0][0],
            })
            .toText();

    return ranked.map(([desc, count]) => `${count} ${desc}`).join(', ');
}

/**
 * A description of output that moved, naming which way each one went (#149).
 * "moved" alone said nothing about where things went, which is most of what
 * movement means.
 */
export function describeMovedOutput(locales: Locales, moved: Moved) {
    const descriptions: string[] = [];
    for (const { output, prior, present } of moved.values()) {
        if (!describable(output)) continue;
        const direction = describeDirection(locales, prior, present);
        descriptions.push(
            direction === undefined
                ? output.getShortDescription(locales)
                : locales
                      .concretize((l) => l.ui.output.moved, {
                          name: output.getShortDescription(locales),
                          direction,
                          // Where it landed, so two moves the same way don't
                          // produce identical text a screen reader won't
                          // re-read.
                          place: describePlace(locales, present.place),
                      })
                      .toText(),
        );
    }

    if (descriptions.length === 0) return '';
    else
        return (
            locales.getPrimaryPlainText((l) => l.glossary.moved.word) +
            ', ' +
            descriptions.join(', ')
        );
}
