/**
 * The music editor's own player: it sounds what is *written*, not what the
 * program last evaluated.
 *
 * A creator composing needs to hear the notes on the staff in front of them,
 * which may sit in a branch the program isn't taking, in a paused project, or
 * in one that isn't running at all. The stage's player can't help with any of
 * those — it plays what an evaluation produced.
 *
 * **The preview takes over while it plays.** Both players share one
 * `MusicAudio`, so two transports at different positions would simply sound
 * like a mistake. `previewing` is what the stage watches to stand down: it
 * suspends, which freezes rather than stops, so handing control back resumes
 * the piece where it was rather than restarting it.
 */

import audio from '@output/Music/MusicAudio';
import MusicPlayer from '@output/Music/MusicPlayer';
import samples from '@output/Music/InstrumentSamples';
import type { MusicData } from '@output/Music/musicData';
import { writable, type Readable } from 'svelte/store';

/** True while the editor is playing, so the stage knows to hold still. */
const previewing = writable(false);
export const isPreviewing: Readable<boolean> = previewing;

/**
 * Where the preview has reached, in beats from the start of the piece, or
 * undefined when nothing is playing.
 *
 * Published from here rather than polled by the editor: the position advances
 * on the audio clock, which has no events, so *something* has to sample it
 * every frame — and the module that knows when playing starts and stops is
 * the one that can start and stop the sampling reliably. A component effect
 * has to infer both from props.
 */
const position = writable<number | undefined>(undefined);
export const previewPosition: Readable<number | undefined> = position;

/** Beats the played data was shifted by, so the head reads against the piece
 * the creator is looking at rather than the trimmed copy being played. */
let offset = 0;
let frame: number | undefined = undefined;

function follow() {
    const beat = player?.positions().get(current?.name ?? '')?.beat;
    position.set(beat === undefined ? undefined : offset + beat);
    frame = requestAnimationFrame(follow);
}

function startFollowing() {
    if (frame !== undefined || typeof requestAnimationFrame === 'undefined')
        return;
    frame = requestAnimationFrame(follow);
}

function stopFollowing() {
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = undefined;
    position.set(undefined);
}

let player: MusicPlayer | undefined = undefined;
/** What the preview is playing, kept so a later edit can splice into it. */
let current: MusicData | undefined = undefined;

/** Wall-clock timer, matching the stage player's: the scheduler has to wake in
 * a hidden tab, where the animation-frame loop does not run. */
function setTimer(callback: () => void, ms: number): () => void {
    const id = setInterval(callback, ms);
    return () => clearInterval(id);
}

function ensure(): MusicPlayer {
    if (player === undefined)
        player = new MusicPlayer({
            audio,
            setTimer,
            isHidden: () =>
                typeof document !== 'undefined' &&
                document.visibilityState === 'hidden',
            // No `onBeat`: a preview must not drive the program's `@Beat`
            // streams, or auditioning a passage would advance the project.
            ready: (instrument) => samples.ready(instrument),
            observeReady: (listener) => samples.observe(listener),
        });
    return player;
}

/**
 * Play a music from `beat`, or restart it there if already playing.
 *
 * The beat is applied by rotating the data rather than seeking the transport:
 * the editor's cursor names a place in what is written, and starting the
 * written thing there is the same as starting a piece that begins there.
 */
export function play(data: MusicData, beat = 0): void {
    startOn(ensure(), data, beat);
    offset = beat;
    previewing.set(true);
    startFollowing();
}

/**
 * Start `data` at `beat` on a given player, and report what was handed over.
 *
 * Separate from `play` so a test can drive it with a clock it controls: the
 * module's own player exists only in a browser, and the rule this encodes —
 * clear before starting — is exactly the part that was wrong.
 */
export function startOn(
    player: MusicPlayer,
    data: MusicData,
    beat: number,
): MusicData {
    // Cleared first, because `play` means "start here" and the player has no
    // other way to hear that. Trimming the music with `from` changes its
    // content, and content is what reconcile compares — so handing the trimmed
    // piece to a *suspended* entry reads as "resume where you froze, then
    // splice these notes in at the next beat", which plants the already-trimmed
    // piece partway through itself. Pausing and playing again then jumped
    // forward by however far in the piece the pause happened, compounding each
    // time. A silenced player has nothing to resume, so the next update starts
    // the piece at its own beat 0, which is what `from` already made it mean.
    player.silence();
    current = beat > 0 ? from(data, beat) : data;
    player.update([current], true);
    return current;
}

/** Freeze the preview and hand the stage back its music. */
export function pause(): void {
    if (current !== undefined) ensure().update([current], false);
    previewing.set(false);
    stopFollowing();
}

/** Stop and forget, for when the editor closes. */
export function stop(): void {
    player?.silence();
    current = undefined;
    previewing.set(false);
    stopFollowing();
}

/** Follow an edit while playing, so a change is heard without restarting. */
export function revise(data: MusicData): void {
    if (current === undefined || player === undefined) return;
    current = data;
    player.update([data], true);
}

/**
 * The playhead's beat within the written piece.
 *
 * A looping track restarts, but the transport's beat count doesn't — it goes
 * on climbing, and an unwrapped head walks off the end of the staff and never
 * comes back. Wrapped by one pass through what is playing.
 *
 * A one-shot is left alone: its head should stop at the end rather than jump
 * back through music that isn't playing any more. So is a mixed piece, where
 * some tracks loop and some don't — there is no single length to wrap to, and
 * guessing one would put the head in the wrong place.
 */
export function wrapPlayhead(
    beat: number,
    tracks: readonly { notes: readonly { beats: number }[]; loop: boolean }[],
): number {
    if (tracks.length === 0 || !tracks.every((track) => track.loop))
        return beat;
    const length = Math.max(
        ...tracks.map((track) =>
            track.notes.reduce((total, note) => total + note.beats, 0),
        ),
    );
    return length > 0 ? ((beat % length) + length) % length : beat;
}

/**
 * The same music, rewritten to begin at `beat`.
 *
 * Every track drops whatever falls before the cursor, and a note the cursor
 * lands inside is shortened to the part that hadn't been heard yet — the same
 * rule the transport's own pickup uses when a paused piece resumes, so
 * starting mid-note sounds like continuing rather than re-striking.
 */
export function from(data: MusicData, beat: number): MusicData {
    return {
        ...data,
        tracks: data.tracks.map((track) => {
            const notes = [];
            let onset = 0;
            for (const note of track.notes) {
                const end = onset + note.beats;
                if (end > beat)
                    notes.push(
                        onset >= beat ? note : { ...note, beats: end - beat },
                    );
                onset = end;
            }
            return { ...track, notes };
        }),
    };
}
