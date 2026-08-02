/**
 * The per-evaluator orchestrator: holds a transport per named music, wakes on
 * a timer to schedule the next lookahead window, and emits beats when they
 * become audible. Dependencies are injected — the audio layer, the timer,
 * and the vibrator — so the whole class is exercisable in vitest against a
 * recorder and a manual clock, the way `announcerQueue.ts` is tested apart
 * from `Announcer.svelte`.
 */

import type { MusicData } from '@output/Music/musicData';
import {
    beatAt,
    createTransport,
    drain,
    requestSplice,
    type Transport,
} from '@output/Music/transport';
import {
    scheduleWindow,
    type BeatTick,
    type ScheduledNote,
} from '@output/Music/schedule';
import { reconcile, type LiveMusic } from '@output/Music/reconcile';
import { chooseSteal, VoiceCap, type Voice } from '@output/Music/voices';
import type { MusicAudioLike, PlayerBus, PlayingVoice } from '@output/Music/MusicAudio';

/** How often the scheduler wakes, in milliseconds. */
export const TickInterval = 25;
/** How far ahead to schedule while the tab is visible, in seconds. */
export const VisibleLookahead = 0.15;
/**
 * How far ahead to schedule while the tab is hidden. Background timers clamp
 * to ~1s, so a 150ms window would starve; audible Web Audio pages are exempt
 * from the harsher intensive throttling, making ~1s the worst case to cover.
 */
export const HiddenLookahead = 2.5;

export type PlayerDeps = {
    audio: MusicAudioLike;
    /** Start a repeating timer; returns its canceller. */
    setTimer: (callback: () => void, ms: number) => () => void;
    /** Emit a beat to the evaluator's Beat streams. */
    onBeat?: (beat: BeatTick) => void;
    /** Report what is sounding, for the visualizations. */
    onSound?: (music: string, notes: readonly ScheduledNote[]) => void;
    /** Forget a music's activity when it stops. */
    onSilent?: (music: string) => void;
    vibrate?: (ms: number) => void;
    /** Whether the tab is hidden, for lookahead sizing. */
    isHidden?: () => boolean;
};

type Entry = {
    transport: Transport;
    /** Voices sounding or scheduled for this music. */
    voices: { voice: Voice; handle: PlayingVoice; startBeat: number }[];
    /** It has scheduled its last note and gone quiet, but is still on stage.
     * Kept rather than forgotten so a later evaluation doesn't mistake it for
     * a music entering the stage and start it over. */
    finished: boolean;
    /** It has left the stage: schedule nothing more, but let whatever is
     * already sounding ring out rather than cutting it. The entry is dropped
     * once its last voice ends. */
    stopping: boolean;
};

export default class MusicPlayer {
    private readonly deps: PlayerDeps;
    private readonly entries = new Map<string, Entry>();
    private bus: PlayerBus | undefined = undefined;
    private cancelTimer: (() => void) | undefined = undefined;
    private pendingBeats: BeatTick[] = [];
    /** Scheduled notes waiting to become audible, for the visualizations. */
    private pendingSounds: ScheduledNote[] = [];
    private nextVoiceId = 0;
    private ducked = false;
    private duckDepth = 0.2;

    constructor(deps: PlayerDeps) {
        this.deps = deps;
    }

    /** Reconcile the music present on stage this evaluation. Silent unless
     * playing, so a paused stage — a preview of code being read with the
     * caret — never sounds over the announcements describing it. */
    update(present: readonly MusicData[], playing: boolean) {
        if (!playing) {
            this.silence();
            return;
        }

        const live = new Map<string, LiveMusic>();
        for (const [name, entry] of this.entries)
            live.set(name, {
                data: entry.transport.data,
                draining: entry.transport.draining,
                finished: entry.finished,
            });

        const now = this.deps.audio.now();
        for (const [name, decision] of reconcile(live, present)) {
            const entry = this.entries.get(name);
            switch (decision.kind) {
                case 'start':
                    this.entries.set(name, {
                        transport: createTransport(decision.data, now),
                        voices: [],
                        finished: false,
                        stopping: false,
                    });
                    break;
                case 'restart':
                    // A restart interrupts what is sounding rather than
                    // layering a second copy over it. This is one of only two
                    // places a note is ever cut short, and both are asked for:
                    // here the creator said replay, and in `silence` the stage
                    // was paused.
                    if (entry) this.cancelVoices(entry);
                    this.entries.set(name, {
                        transport: createTransport(decision.data, now),
                        voices: [],
                        finished: false,
                        stopping: false,
                    });
                    break;
                case 'splice':
                    if (entry)
                        entry.transport = requestSplice(
                            entry.transport,
                            decision.data,
                            now,
                        );
                    break;
                case 'drain':
                    if (entry) entry.transport = drain(entry.transport);
                    break;
                case 'stop':
                    // Leaving the stage stops the music; it does not silence
                    // the note already sounding. Nothing further is scheduled
                    // and the entry is dropped once its last voice ends, so a
                    // loop really does end — it just ends on a whole note.
                    if (entry) {
                        entry.stopping = true;
                        if (entry.voices.length === 0)
                            this.entries.delete(name);
                    } else this.entries.delete(name);
                    this.deps.onSilent?.(name);
                    break;
                case 'keep':
                    break;
            }
        }

        if (this.hasUnfinished()) this.start();
        else this.stopTimer();
    }

    /** Duck the master bus while something else is speaking. Re-applies when
     * the viewer changes the depth mid-duck, so the setting takes effect
     * without waiting for the next announcement. */
    setDucking(ducked: boolean, depth: number) {
        if (ducked === this.ducked && depth === this.duckDepth) return;
        const depthChanged = depth !== this.duckDepth;
        this.ducked = ducked;
        this.duckDepth = depth;
        if (ducked || !depthChanged) this.deps.audio.setDucked(ducked, depth);
    }

    private start() {
        if (this.cancelTimer !== undefined) return;
        this.cancelTimer = this.deps.setTimer(() => this.tick(), TickInterval);
    }

    private stopTimer() {
        this.cancelTimer?.();
        this.cancelTimer = undefined;
    }

    /** Schedule the next window and release beats that have become audible. */
    tick() {
        const audio = this.deps.audio;
        const now = audio.now();
        const lookahead = this.deps.isHidden?.()
            ? HiddenLookahead
            : VisibleLookahead;

        for (const [name, entry] of this.entries) {
            // A finished music holds its place silently until it is replayed
            // or leaves the stage; there is nothing left to schedule for it.
            // A stopping one has left the stage and is only ringing out.
            if (entry.finished || entry.stopping) continue;
            const result = scheduleWindow(entry.transport, now + lookahead);
            entry.transport = result.next;

            for (const note of result.notes) this.playNote(entry, note);
            this.pendingBeats.push(...result.beats);
            this.pendingSounds.push(...result.notes);

            // A drained music that has scheduled its last note is done once
            // its voices have finished sounding.
            if (
                result.finished &&
                entry.voices.every((held) => held.voice.released)
            ) {
                entry.finished = true;
                this.deps.onSilent?.(name);
            }
        }

        // Visuals follow what is heard, for the same reason beats do.
        const sounding = this.pendingSounds.filter(
            (note) => note.startTime <= now,
        );
        if (sounding.length > 0) {
            this.pendingSounds = this.pendingSounds.filter(
                (note) => note.startTime > now,
            );
            const byMusic = new Map<string, ScheduledNote[]>();
            for (const note of sounding) {
                const list = byMusic.get(note.music) ?? [];
                list.push(note);
                byMusic.set(note.music, list);
            }
            for (const [name, notes] of byMusic)
                this.deps.onSound?.(name, notes);
        }

        // Emit beats when they are heard, not when they were scheduled: a
        // 2.5s hidden-tab lookahead would otherwise run visuals seconds ahead
        // of the sound they describe.
        const audible = this.pendingBeats.filter((beat) => beat.time <= now);
        if (audible.length > 0) {
            this.pendingBeats = this.pendingBeats.filter(
                (beat) => beat.time > now,
            );
            for (const beat of audible) {
                this.deps.onBeat?.(beat);
                this.deps.vibrate?.(10);
            }
        }

        // Retire voices whose notes have ended — genuinely ended, release
        // included, which only the audio layer knows. Testing the start time
        // here instead marked a note finished the instant it began, and a
        // music that looked finished was one an emptied note list could
        // restart, which cancelled the note while it was still sounding.
        for (const entry of this.entries.values()) {
            for (const held of entry.voices)
                if (!held.voice.released && held.handle.endsAt <= now)
                    held.voice.released = true;
            // Voices that have finished are worth forgetting: a long-running
            // stage would otherwise accumulate them for as long as it plays.
            entry.voices = entry.voices.filter((held) => !held.voice.released);
        }

        // A music that left the stage while sounding is retired once its last
        // voice has rung out, not before.
        for (const [name, entry] of [...this.entries])
            if (entry.stopping && entry.voices.length === 0)
                this.entries.delete(name);

        if (!this.hasUnfinished()) this.stopTimer();
    }

    /** Whether the scheduler still has work: notes to schedule, or voices
     * ringing out that the tick loop has to retire. */
    private hasUnfinished(): boolean {
        for (const entry of this.entries.values())
            if (!entry.finished || entry.voices.length > 0) return true;
        return false;
    }

    private playNote(entry: Entry, note: ScheduledNote) {
        if (this.bus === undefined) this.bus = this.deps.audio.createBus();
        const active = this.allVoices();
        const victim = chooseSteal(active, VoiceCap);
        if (victim !== undefined) this.stealVoice(victim);

        const handle = this.deps.audio.playNote(this.bus, note);
        if (handle === undefined) return;
        entry.voices.push({
            voice: {
                id: this.nextVoiceId++,
                music: note.music,
                startTime: note.startTime,
                velocity: note.velocity,
                released: false,
            },
            handle,
            startBeat: note.startBeat,
        });
    }

    private allVoices(): Voice[] {
        const voices: Voice[] = [];
        for (const entry of this.entries.values())
            for (const held of entry.voices) voices.push(held.voice);
        return voices;
    }

    private stealVoice(victim: Voice) {
        for (const entry of this.entries.values()) {
            const index = entry.voices.findIndex(
                (held) => held.voice.id === victim.id,
            );
            if (index >= 0) {
                entry.voices[index].handle.cancel();
                entry.voices.splice(index, 1);
                return;
            }
        }
    }

    private cancelVoices(entry: Entry) {
        for (const held of entry.voices) held.handle.cancel();
        entry.voices = [];
    }

    /** Pause, step, or stop: cancel everything and forget where we were, so
     * pressing play starts from the top (as Say re-speaks on play). */
    silence() {
        for (const [name, entry] of this.entries) {
            this.cancelVoices(entry);
            this.deps.onSilent?.(name);
        }
        this.entries.clear();
        this.pendingBeats = [];
        this.pendingSounds = [];
        this.stopTimer();
    }

    dispose() {
        this.silence();
        this.bus?.dispose();
        this.bus = undefined;
    }

    /** How many music values are playing; for tests and diagnostics. */
    get size() {
        return this.entries.size;
    }

    /**
     * Where each playing music is right now, in beats, with the version of it
     * that is actually sounding.
     *
     * The sheet-music rendering needs a playhead, and this is the only honest
     * source of one: `beatAt` is the same function the scheduler uses, so it
     * is exact rather than an estimate, and it stays continuous across a tempo
     * splice because a splice re-anchors the transport's origin. Reconstructing
     * it outside the player would mean calling `MusicAudio.now()`, which
     * *constructs an AudioContext* — something a decoration must never do on a
     * paused stage, a preview, or a thumbnail.
     *
     * `data` is the transport's own, not the evaluator's latest: across a
     * pending splice they differ, and a score should draw what is being heard.
     */
    positions(): Map<string, { beat: number; data: MusicData }> {
        const now = this.deps.audio.now();
        const positions = new Map<string, { beat: number; data: MusicData }>();
        for (const [name, entry] of this.entries)
            positions.set(name, {
                beat: beatAt(entry.transport, now),
                data: entry.transport.data,
            });
        return positions;
    }
}
