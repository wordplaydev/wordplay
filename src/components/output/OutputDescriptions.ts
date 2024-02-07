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
) {
    return entered.size > 0
        ? locales.get((l) => l.term.entered) +
              ' ' +
              Array.from(entered.values())
                  .filter(
                      (output): output is Phrase => output instanceof Phrase,
                  )
                  .map((output) => output.getDescription(locales))
                  .join(', ')
        : '';
}

/** A description of non-entering phrases that changed text, computed after still. */
export function describedChangedOutput(
    locales: Locales,
    entered: OutputsByName,
    present: OutputsByName,
    previouslyPresent: OutputsByName | undefined,
) {
    const changed: string[] = [];
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
                const currentText = output.getDescription(locales).toString();
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
                    changed.push(
                        currentText +
                            (sequenceDescription
                                ? ` ${sequenceDescription} animation`
                                : ''),
                    );
                }
            }
        }
    }
    return changed;
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
