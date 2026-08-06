/**
 * Folding a MIDI file's tempo map into note lengths.
 *
 * `Music` carries one tempo and `Track` carries none, so a piece that speeds
 * up halfway through cannot say so. It can still *sound* right: the player
 * computes a note's length as `beats × 60 / tempo`, so a note written in a
 * region running at `bpm` is played correctly at a fixed tempo `T` if its
 * length is scaled by `T / bpm`. Scaling every note and rest that way
 * preserves both durations and onsets exactly, because a track's entries tile.
 *
 * What it does not preserve is the *meaning* of a beat. A quarter note in a
 * 60bpm region under a fixed 120 reads as `2beats`, and a `Beat` stream pulses
 * at `T` rather than at the score's beat. That's the trade: the music is heard
 * as written, and the notation stops describing the score's own metre.
 *
 * Positions are the thing to round, not lengths. Entries tile, so rounding
 * each length independently lets the error walk — a thousand notes at half a
 * millibeat each is half a beat of drift. Rounding the running position and
 * emitting differences keeps total drift at one rounding step no matter how
 * long the piece.
 */

/** A tempo in force from a tick onward. */
export type TempoChange = { ticks: number; bpm: number };

/** What a Standard MIDI File means when it declares no tempo at all. */
export const DefaultBPM = 120;

/**
 * The file's tempo changes as contiguous regions covering tick 0 onward:
 * sorted, deduplicated by tick (a later declaration at the same tick wins),
 * and opened with MIDI's default if the file's first change comes late.
 */
export function tempoRegions(tempos: readonly TempoChange[]): TempoChange[] {
    const sorted = [...tempos]
        .filter((tempo) => Number.isFinite(tempo.bpm) && tempo.bpm > 0)
        .sort((a, b) => a.ticks - b.ticks);

    const regions: TempoChange[] = [];
    for (const tempo of sorted) {
        const last = regions[regions.length - 1];
        if (last !== undefined && last.ticks === tempo.ticks)
            regions[regions.length - 1] = tempo;
        else regions.push(tempo);
    }

    if (regions.length === 0) return [{ ticks: 0, bpm: DefaultBPM }];
    if (regions[0].ticks > 0)
        regions.unshift({ ticks: 0, bpm: DefaultBPM });
    return regions;
}

/**
 * The tempo to fix the music at: whichever is in force for the most ticks.
 *
 * The majority region is the one whose notes keep tidy lengths, since it
 * scales by exactly 1. Taking the first change instead would leave a piece
 * with a four-bar intro writing its entire body in sixteenths of a beat.
 */
export function dominantTempo(
    regions: readonly TempoChange[],
    endTicks: number,
): number {
    const held = new Map<number, number>();
    for (let i = 0; i < regions.length; i++) {
        const from = regions[i].ticks;
        const to = i + 1 < regions.length ? regions[i + 1].ticks : endTicks;
        const span = Math.max(0, to - from);
        held.set(regions[i].bpm, (held.get(regions[i].bpm) ?? 0) + span);
    }

    let best = regions[0]?.bpm ?? DefaultBPM;
    let bestSpan = -1;
    for (const [bpm, span] of held)
        if (span > bestSpan) {
            bestSpan = span;
            best = bpm;
        }
    return best;
}

/**
 * A tick position to the beat position that sounds at the same moment when
 * played at `fixed` bpm — the piecewise integral of `fixed / bpm` over the
 * regions. A note spanning a tempo change is therefore scaled piecewise
 * rather than taking whichever tempo it happened to begin in.
 */
export function tempoScale(
    regions: readonly TempoChange[],
    fixed: number,
    division: number,
): (ticks: number) => number {
    // Beats accumulated up to the start of each region, so a lookup is a
    // search plus one multiply rather than a walk from the top per note.
    const before: number[] = [];
    let total = 0;
    for (let i = 0; i < regions.length; i++) {
        before.push(total);
        const to = i + 1 < regions.length ? regions[i + 1].ticks : Infinity;
        if (Number.isFinite(to))
            total +=
                ((to - regions[i].ticks) / division) * (fixed / regions[i].bpm);
    }

    return (ticks: number) => {
        if (ticks <= 0) return 0;
        // The last region starting at or before `ticks`.
        let low = 0;
        let high = regions.length - 1;
        while (low < high) {
            const middle = Math.ceil((low + high) / 2);
            if (regions[middle].ticks <= ticks) low = middle;
            else high = middle - 1;
        }
        return (
            before[low] +
            ((ticks - regions[low].ticks) / division) *
                (fixed / regions[low].bpm)
        );
    };
}
