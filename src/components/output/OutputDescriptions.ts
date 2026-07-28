import type Locales from '@locale/Locales';
import Evaluate from '@nodes/Evaluate';
import Reference from '@nodes/Reference';
import type { Moved, OutputsByName } from '@output/animation/Animator';
import type Output from '@output/Output/Output';
import Say from '@output/Output/Say';
import Sequence from '@output/animation/Sequence';

/**
 * Whether this output should be described aloud. Everything on stage should be
 * — except a Say, which speech synthesis already voices, so describing it here
 * would deliver it twice in two different voices.
 */
function describable(output: Output): boolean {
    return !(output instanceof Say);
}

/** A description of output that has entered the scene, computed after still. */
export function describeEnteredOutput(
    locales: Locales,
    entered: OutputsByName,
): string | undefined {
    const descriptions = Array.from(entered.values())
        .filter(describable)
        .map((output) => output.getDescription(locales));
    // Nothing describable — a stage holding only a Say — reads as an
    // announcement of the word "new" with nothing after it, so say nothing and
    // let the caller fall through to what changed or moved.
    return descriptions.length === 0
        ? undefined
        : locales.getPrimaryPlainText((l) => l.glossary.entered.word) +
              ' ' +
              descriptions.join(', ');
}

/** A description of non-entering output that changed text, computed after still. */
export function describedChangedOutput(
    locales: Locales,
    entered: OutputsByName,
    present: OutputsByName,
    previouslyPresent: OutputsByName | undefined,
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
                    ?.getDescription(locales)
                    .toString();
                const currentText = output.getDescription(locales).trim();
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
    return Object.keys(changes).length === 0
        ? undefined
        : [...Object.entries(changes)]
              .sort((a, b) => b[1] - a[1])
              .map(([desc, count]) => `${count} ${desc}`)
              .join(', ');
}

export function describeMovedOutput(locales: Locales, moved: Moved) {
    const descriptions: string[] = [];
    for (const { output } of moved.values()) {
        if (describable(output))
            descriptions.push(output.getShortDescription(locales));
    }

    if (descriptions.length === 0) return '';
    else
        return (
            locales.getPrimaryPlainText((l) => l.glossary.moved.word) +
            ', ' +
            descriptions.join(', ')
        );
}
