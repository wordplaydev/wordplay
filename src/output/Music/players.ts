/**
 * A ref-counted registry of players, one per evaluator — the shape
 * `AudioSource.ts` uses for microphone streams. Two views of the same
 * evaluator (a stage and its fullscreen twin) share one transport rather
 * than sounding twice, and the player is torn down when the last view
 * releases it.
 */

import type Evaluator from '@runtime/Evaluator';
import Beat from '@input/Beat/Beat';
import MusicPlayer, { type PlayerDeps } from '@output/Music/MusicPlayer';
import audio from '@output/Music/MusicAudio';
import { get } from 'svelte/store';
import { haptics } from '@db/Database';
import { clearActivity, reportActivity } from '@output/Music/activity';

export type MusicPlayerHandle = {
    readonly player: MusicPlayer;
    release(): void;
};

const players = new Map<Evaluator, { player: MusicPlayer; count: number }>();

/** Wall-clock repeating timer; the scheduler needs to wake in background
 * tabs, where the evaluator's animation-frame loop does not run. */
function setTimer(callback: () => void, ms: number): () => void {
    const id = setInterval(callback, ms);
    return () => clearInterval(id);
}

/**
 * Acquire the player for an evaluator, creating it on first use. Call only
 * when there is music to play and the stage is playing, so previews,
 * thumbnails, and analysis never construct an AudioContext.
 */
export function acquireMusicPlayer(
    evaluator: Evaluator,
    deps?: Partial<PlayerDeps>,
): MusicPlayerHandle {
    let existing = players.get(evaluator);
    if (existing === undefined) {
        const player = new MusicPlayer({
            audio,
            setTimer,
            isHidden: () =>
                typeof document !== 'undefined' &&
                document.visibilityState === 'hidden',
            // Beats reach only this evaluator's streams, so two playing
            // stages never hear each other — the shape Physics uses to
            // report collisions.
            onBeat: (beat) => {
                for (const stream of evaluator.getBasisStreamsOfType(Beat))
                    stream.react({
                        name: beat.music,
                        count: beat.count,
                        tempo: beat.tempo,
                        volume: beat.volume,
                        key: beat.key,
                        scale: beat.scale,
                        instruments: beat.instruments,
                        words: beat.words,
                        parts: beat.parts,
                    });
            },
            onSound: (music, notes) =>
                reportActivity(
                    music,
                    notes.map((note) => ({
                        instrument: note.instrument,
                        level: note.velocity,
                        degree: note.degree,
                        pan: note.pan,
                        track: note.trackIndex,
                        seconds: note.durationSeconds,
                    })),
                ),
            onSilent: (music) => clearActivity(music),
            vibrate: (ms: number) => {
                if (
                    get(haptics) &&
                    typeof navigator !== 'undefined' &&
                    navigator.vibrate
                )
                    navigator.vibrate(ms);
            },
            ...deps,
        });
        existing = { player, count: 0 };
        players.set(evaluator, existing);
    }
    existing.count++;
    const entry = existing;
    let released = false;
    return {
        player: entry.player,
        release() {
            if (released) return;
            released = true;
            entry.count--;
            if (entry.count <= 0) {
                entry.player.dispose();
                players.delete(evaluator);
            }
        },
    };
}

/**
 * The player for an evaluator if one already exists, and **never** one that
 * doesn't. A visualization is a decoration: it may read what the player is
 * doing, but it must not be the reason an AudioContext comes into being on a
 * paused stage, a preview, or a thumbnail.
 */
export function peekMusicPlayer(evaluator: Evaluator): MusicPlayer | undefined {
    return players.get(evaluator)?.player;
}

/** Every live player, for the app-wide ducking subscription. */
export function livePlayers(): MusicPlayer[] {
    return [...players.values()].map((entry) => entry.player);
}
