/**
 * Note-list edits as pure node transformations: entries in, entries out.
 *
 * Kept apart from the components that call them so the rules of editing —
 * what a drag does to a chord, what a bend rounds to, what happens at the end
 * of a list — can be tested without a pointer, a database, or a DOM. The
 * caller wraps the result in one `ListLiteral` and revises, the way
 * `reviseContent` does for stage content.
 *
 * Every function preserves the *written form* of what it edits. A degree
 * written bare stays bare, a chord stays a chord, and a `♪` keeps its own
 * volume — because rewriting `{1 3 5}` as three separate notes, or dropping a
 * note's volume because it was transposed, would be an edit the creator
 * didn't ask for.
 */

import { getNumber } from '@components/palette/editOutput';
import Evaluate from '@nodes/Evaluate';
import type Expression from '@nodes/Expression';
import Input from '@nodes/Input';
import NoneLiteral from '@nodes/NoneLiteral';
import NumberLiteral from '@nodes/NumberLiteral';
import type Reference from '@nodes/Reference';
import SetLiteral from '@nodes/SetLiteral';
import Unit from '@nodes/Unit';
import { NoteDurations } from '@output/Music/durations';
import type { NoteData } from '@output/Music/musicData';

/**
 * How precisely a bent degree is written.
 *
 * Three decimals is below what anyone can hear as a distinct pitch and keeps
 * a dragged note from writing `1.2000000000000002` into someone's source.
 */
export const BendPrecision = 3;

/** A degree as it should be written: rounded, and without a trailing `.0`. */
export function degreeText(degree: number): string {
    return `${Number(degree.toFixed(BendPrecision))}`;
}

/** A degree literal, keeping whatever note value the entry carried. */
function degreeLiteral(degree: number, unit: Unit | undefined): NumberLiteral {
    return NumberLiteral.make(
        degreeText(degree),
        unit === undefined || unit.isUnitless() ? undefined : unit.clone(),
    );
}

/** The note value written on an entry, so an edit can keep it. */
function unitOf(entry: Expression | undefined): Unit | undefined {
    return entry instanceof NumberLiteral ? entry.unit : undefined;
}

/* ------------------------------------------------------------------ *
 * Editing one entry
 * ------------------------------------------------------------------ */

/**
 * Rewrite every degree of an entry. A rest has none, so it comes back
 * untouched — transposing silence is silence.
 */
export function withDegrees(
    entry: Expression,
    change: (degree: number) => number,
): Expression {
    if (entry instanceof NoneLiteral) return entry;

    if (entry instanceof SetLiteral)
        return SetLiteral.make(
            entry.values.map((value) =>
                degreeLiteral(change(getNumber(value) ?? 0), unitOf(value)),
            ),
        );

    if (entry instanceof Evaluate) {
        // A `♪`, whose first input is the degree — possibly itself a chord.
        const first = entry.inputs[0];
        const degree = first instanceof Input ? first.value : first;
        if (degree === undefined) return entry;
        return entry.replace(degree, withDegrees(degree, change));
    }

    const degree = getNumber(entry);
    return degree === undefined
        ? entry
        : degreeLiteral(change(degree), unitOf(entry));
}

/**
 * Rewrite one voice of a chord, leaving its siblings alone — what dragging a
 * single notehead inside a chord means. A non-chord entry has one voice.
 */
export function withDegreeAt(
    entry: Expression,
    voice: number,
    change: (degree: number) => number,
): Expression {
    if (entry instanceof SetLiteral) {
        const values = entry.values.slice();
        const target = values[voice];
        if (target === undefined) return entry;
        values[voice] = degreeLiteral(
            change(getNumber(target) ?? 0),
            unitOf(target),
        );
        return SetLiteral.make(values);
    }
    return voice === 0 ? withDegrees(entry, change) : entry;
}

/** Give an entry a different note value, keeping its pitches. */
export function withDuration(
    entry: Expression,
    unit: Unit | undefined,
): Expression {
    if (entry instanceof NumberLiteral)
        return NumberLiteral.make(entry.number.getText(), unit?.clone());
    // A chord's length is written on its first member, matching the rule the
    // docs give creators ("put the value on the first number").
    if (entry instanceof SetLiteral && entry.values.length > 0) {
        const values = entry.values.slice();
        values[0] = withDuration(values[0], unit);
        return SetLiteral.make(values);
    }
    // A rest can't carry a value, and a `♪` says its length through its own
    // beat input rather than a unit; neither is changed by the picker.
    return entry;
}

/** Move a note by whole scale degrees. */
export function transposed(entry: Expression, steps: number): Expression {
    return withDegrees(entry, (degree) => degree + steps);
}

/**
 * Bend a note off its scale step by a fraction of a degree — the fractional
 * degrees the note model already understands, so this sounds as two notes or
 * as one bent note depending on the track's `mash`.
 */
export function bent(
    entry: Expression,
    voice: number,
    amount: number,
): Expression {
    return withDegreeAt(entry, voice, (degree) => degree + amount);
}

/** Whether an entry sounds more than one degree at once. */
export function isChord(entry: Expression): boolean {
    return entry instanceof SetLiteral && entry.values.length > 1;
}

/**
 * Turn a note into a chord by adding a degree a third above it — the interval
 * that makes a chord sound like one, rather than an arbitrary second note the
 * creator would have to move before it was music.
 *
 * A rest has no pitch to build on and comes back untouched. A `♪` keeps its
 * own volume: its degree input is what becomes the chord.
 */
export function chorded(entry: Expression): Expression {
    if (entry instanceof NoneLiteral) return entry;

    if (entry instanceof Evaluate) {
        const first = entry.inputs[0];
        const degree = first instanceof Input ? first.value : first;
        return degree === undefined
            ? entry
            : entry.replace(degree, chorded(degree));
    }

    if (entry instanceof SetLiteral) {
        const top = entry.values[entry.values.length - 1];
        const degree = top === undefined ? undefined : getNumber(top);
        return degree === undefined
            ? entry
            : SetLiteral.make([
                  ...entry.values,
                  degreeLiteral(degree + 2, undefined),
              ]);
    }

    const degree = getNumber(entry);
    return degree === undefined
        ? entry
        : SetLiteral.make([
              degreeLiteral(degree, unitOf(entry)),
              degreeLiteral(degree + 2, undefined),
          ]);
}

/**
 * Reduce a chord to its lowest note, keeping the length written on it so the
 * rhythm doesn't change when the harmony does.
 */
export function unchorded(entry: Expression): Expression {
    if (entry instanceof Evaluate) {
        const first = entry.inputs[0];
        const degree = first instanceof Input ? first.value : first;
        return degree === undefined
            ? entry
            : entry.replace(degree, unchorded(degree));
    }
    if (!(entry instanceof SetLiteral) || entry.values.length === 0)
        return entry;
    const lowest = entry.values.reduce((low, value) =>
        (getNumber(value) ?? 0) < (getNumber(low) ?? 0) ? value : low,
    );
    return degreeLiteral(
        getNumber(lowest) ?? 0,
        unitOf(entry.values[0]) ?? unitOf(lowest),
    );
}

/* ------------------------------------------------------------------ *
 * Editing the list
 * ------------------------------------------------------------------ */

/** Insert a new note before `index`. An index past the end appends. */
export function inserted(
    entries: readonly Expression[],
    index: number,
    degree: number,
    unit: Unit | undefined,
): Expression[] {
    const at = Math.max(0, Math.min(index, entries.length));
    return [
        ...entries.slice(0, at),
        degreeLiteral(degree, unit),
        ...entries.slice(at),
    ];
}

/** Remove the note at `index`. */
export function removed(
    entries: readonly Expression[],
    index: number,
): Expression[] {
    return index < 0 || index >= entries.length
        ? [...entries]
        : [...entries.slice(0, index), ...entries.slice(index + 1)];
}

/**
 * Move a note through the list. The ends hold rather than wrap: a note dragged
 * off the left of the staff should stop at the beginning, not reappear at the
 * end, which is what a creator would read as losing it.
 */
export function moved(
    entries: readonly Expression[],
    index: number,
    direction: 1 | -1,
): Expression[] {
    const to = index + direction;
    if (index < 0 || index >= entries.length || to < 0 || to >= entries.length)
        return [...entries];
    const next = entries.slice();
    next[index] = entries[to];
    next[to] = entries[index];
    return next;
}

/** Replace the note at `index`, leaving the rest of the list alone. */
export function replaced(
    entries: readonly Expression[],
    index: number,
    entry: Expression,
): Expression[] {
    if (index < 0 || index >= entries.length) return [...entries];
    const next = entries.slice();
    next[index] = entry;
    return next;
}

/**
 * A transcribed note or rest as a written entry.
 *
 * A unit is **found or not written** — never defaulted. Falling back to
 * `Unit.create([''])` for a length with no glyph produced a number carrying a
 * dimension named with the empty string, which is neither unitless nor a note
 * value, so `Track` refused the whole list. And because an empty name renders
 * as nothing, the offending entry was spelled exactly like a correct one, so
 * the source looked fine and would not type.
 *
 * `Note` is the escape for lengths the notation has no glyph for — 5 beats,
 * say, which whole-beat rounding produces readily. It is the form the MIDI
 * importer already writes, so the two ways music arrives agree.
 */
export function entryFor(note: NoteData, noteReference: Reference): Expression {
    const degree =
        note.degrees.length === 0
            ? NoneLiteral.make()
            : NumberLiteral.make(degreeText(note.degrees[0]));

    // A bare entry is one beat, so a one-beat entry needs no length at all.
    if (note.beats === 1) return degree;

    const value = NoteDurations.find(
        (duration) => duration.beats === note.beats,
    );
    // A rest carries no unit, so only a degree can take one.
    if (value !== undefined && note.degrees.length > 0)
        return NumberLiteral.make(
            degreeText(note.degrees[0]),
            Unit.create([value.unit]),
        );

    return Evaluate.make(noteReference, [
        degree,
        NumberLiteral.make(degreeText(note.beats), Unit.create(['beats'])),
    ]);
}
