/**
 * Sound one phoneme, for the phoneme chooser.
 *
 * The chooser is the reference for what the IPA symbols mean, and the honest
 * definition of a speech sound is the sound — a written gloss like "the *sh* in
 * *she*" only helps someone who already reads English, while a played `ʃ` helps
 * everyone. We happen to own a synthesizer that can pronounce every symbol we
 * accept, so the reference costs a note.
 *
 * Split the way the rest of the music code is: `phonemeNote` decides, and is
 * pure and testable, while `previewPhoneme` is the thin part that needs a
 * browser.
 */

import audio from '@output/Music/MusicAudio';
import { canSustain, Phonemes } from '@output/Music/phonemes';
import type { ScheduledNote } from '@output/Music/schedule';

/** Long enough to hold a consonant well past its glide and still frame it,
 * short enough to audition quickly. */
export const PreviewSeconds = 1;

/**
 * How much longer a held consonant is in a demonstration than in speech.
 *
 * Written as IPA length marks, which the parser already understands, because
 * this is exactly what they mean. Each `ː` doubles.
 *
 * Speech runs a consonant fast: an approximant is 60ms, and 35 of those are
 * the formants still travelling to it, leaving about four glottal pulses of
 * the actual sound inside a preview otherwise made of vowel. Every approximant
 * and every nasal therefore sounded like the same brief dip in the middle of
 * "aa" — the spectra were quite distinct, there was just nothing to hear them
 * in. A demonstration is not speech; it holds the sound up.
 */
const Held = 'ːː';

/**
 * What to sing to demonstrate a symbol.
 *
 * A vowel plays alone; a consonant is framed between two of them. That is how
 * every IPA chart with audio does it, and for the same reason: most consonants
 * are not identifiable in isolation. A stop *is* a closure and a release, so
 * alone it has nothing to close off from and nothing to release into — the
 * glottal stop is the extreme case, being pure silence, but a `b` on its own is
 * barely better. An `l` is heard almost entirely in the transitions on either
 * side of it. Framing them is not a workaround for the synthesis; it is what
 * the sounds are.
 */
export function previewWords(symbol: string): string {
    const phoneme = Phonemes.get(symbol);
    if (phoneme === undefined || phoneme.manner === 'vowel') return symbol;
    // A stop or a click is an event rather than a state — lengthening its
    // burst would turn a pop into a hiss — so only what can be held is held.
    return `a${symbol}${canSustain(phoneme) ? Held : ''}a`;
}

/**
 * How far below middle C a preview sings, in semitones.
 *
 * Low enough that a nasal's defining resonance is audible at all: a murmur
 * lives at about 250Hz, and previewing at middle C put the fundamental *above*
 * it, so `tuneFirstFormant` raised the formant out of the way to meet the note
 * and the nasal quality went with it. G3 leaves room underneath.
 */
const PreviewPitch = -5;

/**
 * The note the chooser plays for a symbol: low in the voice's range, so no
 * symbol is auditioned somewhere it strains, and loud enough to hear over
 * whatever else is on the stage without ducking it.
 */
export function phonemeNote(symbol: string, startTime: number): ScheduledNote {
    return {
        // Not a music the player knows about — this note goes straight to the
        // audio layer, so the name is only for anyone reading a trace.
        music: 'phoneme',
        trackIndex: 0,
        noteIndex: 0,
        degree: 1,
        semitones: PreviewPitch,
        startBeat: 0,
        startTime,
        durationBeats: 1,
        durationSeconds: PreviewSeconds,
        velocity: 1,
        pan: 0,
        instrument: 'voice',
        words: previewWords(symbol),
    };
}

/**
 * Play a symbol through the voice.
 *
 * Deliberately not `previewPlayer`, whose `isPreviewing` store drives the
 * palette's transport UI — auditioning a letter is not the palette previewing a
 * piece, and borrowing it would make the palette's controls flicker. A bus per
 * preview instead, disposed once the note has rung out, which is cheap: a gain
 * and a panner.
 */
export default function previewPhoneme(symbol: string): void {
    const bus = audio.createBus();
    const voice = audio.playNote(bus, phonemeNote(symbol, audio.now()));
    if (voice === undefined) {
        bus.dispose();
        return;
    }
    // `endsAt` includes the release tail, which only the audio layer knows.
    const seconds = Math.max(voice.endsAt - audio.now(), PreviewSeconds);
    setTimeout(() => bus.dispose(), (seconds + 0.1) * 1000);
}
