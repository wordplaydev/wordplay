import { Unwritten } from '@locale/Annotations';
import type { LocaleStringKind } from '@util/verify-locales/classifyLocalePath';

/**
 * Mark a value unwritten, keeping the English after the marker.
 *
 * An unwritten string carries the en-US text it is waiting to replace, so a
 * locale file holds the words needed to render it rather than only a marker
 * pointing at en-US. `createUnwrittenLocale`, `keepOrPlacehold` and
 * `checkUntranslated`'s repair all write this form; this is the one place that
 * decides its shape.
 *
 * A markup array is one document with a single write-status, so only its first
 * element takes the marker. Every other array is a list of separate strings, so
 * each takes its own. Either way the array keeps its length, which is what a
 * positional (`[plain]`) array requires.
 *
 * An `[emotion]` value is an identifier from a closed set rather than prose, so
 * callers must exclude it before calling — a marker there is not an untranslated
 * string but an invalid one, and the locale stops matching the schema.
 */
export default function markUnwritten(
    value: string | string[],
    kind: LocaleStringKind,
): string | string[] {
    if (!Array.isArray(value)) return Unwritten + value;
    return kind === 'markup'
        ? value.map((s, index) => (index === 0 ? Unwritten + s : s))
        : value.map((s) => Unwritten + s);
}
