/**
 * General MIDI's instrument and percussion numbering, mapped onto our palette.
 *
 * GM names 128 instruments and 47 percussion sounds; our palette is a small
 * fraction of that. So this is lossy by construction, and the point is to lose
 * predictably: every GM family maps to the nearest thing we actually have, and
 * anything with no reasonable neighbour is reported rather than quietly turned
 * into a piano.
 *
 * Program and note numbers here are the GM standard's, which is a published
 * specification rather than anyone's musical work.
 */

import type { InstrumentKey } from '@output/Music/instruments';

/** GM percussion lives on channel 10, which is index 9. */
export const PercussionChannel = 9;

/**
 * GM program number (0–127) to our nearest instrument. The families run in
 * eights — piano, chromatic percussion, organ, guitar, bass, strings,
 * ensemble, brass, reed, pipe, synth lead, synth pad, synth effects, ethnic,
 * percussive, sound effects — so this maps family by family.
 */
export function instrumentForProgram(program: number): InstrumentKey {
    const family = Math.floor(program / 8);
    switch (family) {
        case 0: // piano
            return 'piano';
        case 1: // chromatic percussion: celesta, glockenspiel, tubular bells
            return 'bell';
        // GM's organ family ends in three free-reed instruments —
        // accordion, harmonica, and tango accordion. All three are reeds
        // driven by air, so they go to the harmonica rather than staying
        // with the organs.
        case 2:
            return program >= 21 && program <= 23 ? 'harmonica' : 'synthPad';
        // GM's guitar family runs from a nylon acoustic through steel,
        // clean electric, overdrive, and distortion, so the family alone is
        // too coarse now that we have both kinds: program 24 is the nylon
        // one, and everything above it is steel or amplified.
        case 3:
            return program === 24 ? 'acousticGuitar' : 'electricGuitar';
        case 4: // bass
            return 'synthBass';
        case 5: // solo strings
            return 'violin';
        // The ensemble family is string sections up to 51 and then voices —
        // choir aahs, voice oohs, and synth voice — so the top of it goes to
        // the voice and the rest stays with the strings.
        case 6:
            return program >= 52 && program <= 54 ? 'voice' : 'violin';
        case 7: // brass
            return 'trumpet';
        case 8: // reed
            return 'saxophone';
        case 9: // pipe: piccolo, flute, recorder, whistle
            return 'flute';
        case 10: // synth lead
            return 'synth';
        case 11: // synth pad
            return 'synthPad';
        case 12: // synth effects
            return 'synthPad';
        case 13: // ethnic: sitar, banjo, shamisen, koto, kalimba, bagpipe
            // Plucked strings, so the nylon guitar is the closest thing we
            // have — see the palette's note on not faking these outright.
            return 'acousticGuitar';
        case 14: // percussive: tinkle bell, agogo, steel drums, woodblock
            return 'bell';
        default: // 15, sound effects
            return 'synth';
    }
}

/**
 * GM percussion note to a piece of our drum kit, or undefined when we have
 * nothing like it. Our kit is bass, snare, hihat, cymbal, tomtom, cowbell —
 * the six in `Instruments.drums` — so the many GM latin and effect
 * percussion sounds map to the closest of those or to nothing.
 */
export function drumPieceForNote(note: number): string | undefined {
    switch (note) {
        case 35: // acoustic bass drum
        case 36: // bass drum 1
            return 'bass';
        case 37: // side stick
        case 38: // acoustic snare
        case 39: // hand clap
        case 40: // electric snare
            return 'snare';
        case 41: // low floor tom
        case 43: // high floor tom
        case 45: // low tom
        case 47: // low-mid tom
        case 48: // hi-mid tom
        case 50: // high tom
            return 'tomtom';
        case 42: // closed hi-hat
        case 44: // pedal hi-hat
        case 46: // open hi-hat
            return 'hihat';
        case 49: // crash cymbal 1
        case 51: // ride cymbal 1
        case 52: // chinese cymbal
        case 53: // ride bell
        case 55: // splash cymbal
        case 57: // crash cymbal 2
        case 59: // ride cymbal 2
            return 'cymbal';
        case 56: // cowbell
            return 'cowbell';
        default:
            return undefined;
    }
}

/**
 * The degree that strikes a named kit piece. Degrees index a kit one-based,
 * matching `kitIndex` in synthesis.ts.
 */
export function degreeForKitPiece(
    kit: readonly string[],
    piece: string,
): number | undefined {
    const index = kit.indexOf(piece);
    return index < 0 ? undefined : index + 1;
}
