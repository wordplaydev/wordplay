/**
 * Statically analyze music for the ways sound can hurt or startle, the way
 * {@link ./PhotosensitivityAnalysis} does for flashing. Both inspect the
 * *description* of what will happen — the notes are right there in the value —
 * so neither has to play anything to know what it will do.
 *
 * Like its sibling, this sees the initial evaluation only. Stream-driven
 * music, which is the common case, can reach startling volumes reactively
 * where no static analysis can follow it; the master limiter in `MusicAudio`
 * is the honest backstop for that, and this is the warning that lets a viewer
 * decide before pressing play.
 */

import type { MusicData, TrackData } from '@output/Music/musicData';
import { trackLength } from '@output/Music/musicData';
import { degreeToSemitones } from '@output/Music/degrees';
import { MinFlashHz } from '@output/PhotosensitivityAnalysis';
import { isPitched } from '@output/Music/synthesis';

export const MusicRisks = [
    'startle',
    'loudness',
    'pulse',
    'register',
    'tracks',
] as const;

export type MusicRisk = (typeof MusicRisks)[number];

/** A jump this large between adjacent notes is a startle. */
const StartleDelta = 0.5;
/** A passage at or below this level counts as quiet, so a jump out of it
 *  startles more than the same jump would mid-phrase. */
const QuietLevel = 0.25;
/** Sustained loudness: this many consecutive notes at or above this level. */
const LoudLevel = 0.8;
const LoudRun = 8;
/** The summed level at which many tracks together are loud, however quiet
 *  each one is on its own. */
const SummedLoud = 2;
/** Semitones from the tonic beyond which notes are uncomfortably high or low. */
const HighRegister = 30;
const LowRegister = -30;
/** More simultaneous tracks than a listener can follow comfortably. The hard
 *  cap is 128; this is a comfort threshold. */
const ComfortableTracks = 12;

/** The loudest a single entry in a track gets. */
function levelOf(track: TrackData, index: number): number {
    const note = track.notes[index];
    return note === undefined ? 0 : note.volume * track.volume;
}

/** How many notes a track plays per second at the music's tempo. Exported
 * because the mood visualization gates its brightness on the same number:
 * two definitions of "how fast is this music" could disagree, and one of them
 * would be deciding whether a rendering is allowed to flash. */
export function notesPerSecond(music: MusicData, track: TrackData): number {
    const beatsPerSecond = music.tempo / 60;
    let fastest = 0;
    for (const note of track.notes)
        if (note.beats > 0 && note.degrees.length > 0)
            fastest = Math.max(fastest, beatsPerSecond / note.beats);
    return fastest;
}

/** Analyze one music value for risks. */
export function analyzeMusic(music: MusicData): Set<MusicRisk> {
    const risks = new Set<MusicRisk>();

    if (music.tracks.length > ComfortableTracks) risks.add('tracks');

    // The summed level of everything sounding, which is where a "quiet"
    // piece gets loud by accident.
    let summed = 0;
    for (const track of music.tracks) summed += track.volume * music.volume;
    if (summed >= SummedLoud) risks.add('loudness');

    for (const track of music.tracks) {
        // A visual pulse in the seizure band: 180bpm in sixteenths is 12Hz,
        // which a fast tempo reaches easily. Shares its threshold with
        // photosensitivity rather than inventing a new one, since it's the
        // same risk through a different door.
        if (notesPerSecond(music, track) >= MinFlashHz) risks.add('pulse');

        // The level of the last note that actually sounded. Rests don't
        // reset it: a piece with rests in it hasn't got quieter, and the
        // opening note has nothing to jump from, so neither is a startle.
        let lastSounding: number | undefined = undefined;
        let loudRun = 0;
        for (let index = 0; index < track.notes.length; index++) {
            const note = track.notes[index];
            const level = levelOf(track, index) * music.volume;

            if (note.degrees.length > 0) {
                // A large jump out of a quiet passage.
                if (
                    lastSounding !== undefined &&
                    lastSounding <= QuietLevel &&
                    level - lastSounding >= StartleDelta
                )
                    risks.add('startle');
                lastSounding = level;

                loudRun = level >= LoudLevel ? loudRun + 1 : 0;
                if (loudRun >= LoudRun) risks.add('loudness');

                // Wandering out of a comfortable register, which the degree
                // model makes easy: translate(ƒ(n) n + 20) is one keystroke
                // from + 2. Percussion doesn't transpose, so it can't wander.
                if (isPitched(track.instrument)) {
                    for (const degree of note.degrees) {
                        const semitones = degreeToSemitones(
                            degree,
                            track.scale,
                            track.key,
                        );
                        if (
                            semitones > HighRegister ||
                            semitones < LowRegister
                        )
                            risks.add('register');
                    }
                }
            } else {
                loudRun = 0;
            }
        }

        // A looping track's last note is adjacent to its first.
        if (track.loop && track.notes.length > 1 && trackLength(track) > 0) {
            const first = levelOf(track, 0) * music.volume;
            const last = levelOf(track, track.notes.length - 1) * music.volume;
            if (first - last >= StartleDelta && last <= QuietLevel)
                risks.add('startle');
        }
    }

    return risks;
}

/** Analyze every music on a stage. */
export default function analyzeMusicSafety(
    musics: readonly MusicData[],
): Set<MusicRisk> {
    const risks = new Set<MusicRisk>();
    // Many musics playing at once sum the same way many tracks do.
    let summed = 0;
    let tracks = 0;
    for (const music of musics) {
        for (const risk of analyzeMusic(music)) risks.add(risk);
        for (const track of music.tracks)
            summed += track.volume * music.volume;
        tracks += music.tracks.length;
    }
    if (summed >= SummedLoud) risks.add('loudness');
    if (tracks > ComfortableTracks) risks.add('tracks');
    return risks;
}
