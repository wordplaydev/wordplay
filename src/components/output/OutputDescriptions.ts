import type Locales from '../../locale/Locales';
import Evaluate from '../../nodes/Evaluate';
import Reference from '../../nodes/Reference';
import Phrase from '../../output/Phrase';
import type { Moved, OutputsByName } from '../../output/Animator';
import Sequence from '../../output/Sequence';

/** A description of phrases that have entered the scene, computed after still. */
export function describeEnteredOutput(
    locales: Locales,
    entered: OutputsByName,
): string | undefined {
    return entered.size > 0
        ? locales.get((l) => l.term.entered) +
              ' ' +
              Array.from(entered.values())
                  .filter(
                      (output): output is Phrase => output instanceof Phrase,
                  )
                  .map((output) => output.getDescription(locales))
                  .join(', ')
        : undefined;
}

/** A description of non-entering phrases that changed text, computed after still. */
export function describedChangedOutput(
    locales: Locales,
    entered: OutputsByName,
    present: OutputsByName,
    previouslyPresent: OutputsByName | undefined,
): string | undefined {
    const changes: Record<string, number> = {};
    for (const [name, output] of present.entries()) {
        if (output instanceof Phrase) {
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

    return changes.size === 0
        ? undefined
        : [...Object.entries(changes)]
              .sort((a, b) => b[1] - a[1])
              .map(([desc, count]) => `${count} ${desc}`)
              .join(', ');
}

export function describeMovedOutput(locales: Locales, moved: Moved) {
    const descriptions: string[] = [];
    for (const { output } of moved.values()) {
        descriptions.push(output.getShortDescription(locales));
    }

    if (descriptions.length === 0) return '';
    else
        return (
            locales.get((l) => l.term.moved) + ', ' + descriptions.join(', ')
        );
}
