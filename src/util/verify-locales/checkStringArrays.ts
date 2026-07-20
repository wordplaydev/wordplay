import { MachineTranslated, Revised, Unwritten } from '@locale/Annotations';
import type LocaleText from '@locale/LocaleText';
import { classifyPair } from '@util/verify-locales/classifyLocalePath';
import { getKeyTemplatePairs } from '@util/verify-locales/LocalePath';
import type Log from '@util/verify-locales/Log';
import {
    hasOutOfExampleBreak,
    leadingAnnotations,
    splitDocParagraphs,
} from '@util/verify-locales/protect';

/**
 * Check the two kinds of string arrays in a locale against their contracts:
 * positional ('plain') arrays must match the en-US length, while markup
 * ('markup') arrays may be any length but no element may contain a paragraph
 * break outside `\…\` example code (paragraph breaks ARE the element
 * boundaries — see `toDocString`), and their write-status annotation
 * ($?/$!/$~) belongs on the first element only, since the doc is translated
 * atomically and the runtime (`Locales.get`) only inspects the first element.
 * Name arrays are free-length and their element validity is checked elsewhere.
 * With `fix`, repairs a copy: pads (with $?) or truncates positional arrays,
 * and normalizes markup arrays; without it, only logs and returns `target`
 * as-is.
 */
export default function checkStringArrays(
    log: Log,
    source: LocaleText,
    target: LocaleText,
    fix: boolean,
): LocaleText {
    const revised = fix
        ? (JSON.parse(JSON.stringify(target)) as LocaleText)
        : target;
    for (const pair of getKeyTemplatePairs(revised)) {
        const value = pair.value;
        if (!Array.isArray(value)) continue;
        // Regions are locale metadata, not translations of the en-US regions.
        if (pair.top() && pair.key === 'regions') continue;
        const kind = classifyPair(pair);
        if (kind === 'markup') {
            // An empty array carries no text (e.g. a function with no inputs).
            if (value.length === 0) continue;
            const annotations = value.map(leadingAnnotations);
            const status = docStatus(annotations);
            const breaks = value.some(hasOutOfExampleBreak);
            // A single doc-level annotation on the first element and nothing
            // else — anything more is redundant or contradictory.
            const misplaced =
                annotations.some(
                    (annotation, index) => index > 0 && annotation.length > 0,
                ) || annotations[0] !== status;
            if (!breaks && !misplaced) continue;
            for (const [index, element] of value.entries())
                if (hasOutOfExampleBreak(element))
                    log.bad(
                        2,
                        `Paragraph break inside ${pair.toString()}[${index}]; markup array elements must be single paragraphs (blank lines belong between elements or inside \\…\\ examples).`,
                    );
            if (misplaced)
                log.bad(
                    2,
                    `Annotations in ${pair.toString()} belong only on the first element; a markup array is one document with a single write-status.`,
                );
            if (fix) pair.repair(revised, normalizeMarkupArray(value));
        } else if (kind === 'plain') {
            const sourceValue = pair.resolve(source);
            if (
                Array.isArray(sourceValue) &&
                sourceValue.length !== value.length
            ) {
                log.bad(
                    2,
                    `${pair.toString()} has ${value.length} items but en-US has ${sourceValue.length}; this array is positional and must match.`,
                );
                if (fix)
                    pair.repair(
                        revised,
                        value.length > sourceValue.length
                            ? value.slice(0, sourceValue.length)
                            : [
                                  ...value,
                                  ...new Array<string>(
                                      sourceValue.length - value.length,
                                  ).fill(Unwritten),
                              ],
                    );
            }
        }
    }
    return revised;
}

/** The doc-level write-status: the highest-priority annotation found on any
 *  element ($? > $! > $~), or '' if none. */
function docStatus(annotations: string[]): string {
    return annotations.some((a) => a.includes(Unwritten))
        ? Unwritten
        : annotations.some((a) => a.includes(Revised))
          ? Revised
          : annotations.some((a) => a.includes(MachineTranslated))
            ? MachineTranslated
            : '';
}

/** The canonical form of a markup array: paragraph breaks only between
 *  elements, and the doc-level write-status on the first element only. */
function normalizeMarkupArray(value: string[]): string[] {
    const annotations = value.map(leadingAnnotations);
    const status = docStatus(annotations);
    const paragraphs = value.flatMap((element, index) =>
        splitDocParagraphs(element.slice(annotations[index].length)),
    );
    // Nothing but markers (a bare placeholder doc)? Keep the status alone.
    if (paragraphs.length === 0) return status === '' ? value : [status];
    return paragraphs.map((p, index) => (index === 0 ? status + p : p));
}
