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
    seekTransport,
    type Transport,
} from '@output/Music/transport';
import {
    pickupNotes,
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
/**
 * How many {mark, beat} samples to keep per music, matching the evaluator's own
 * MAX_STREAM_LENGTH: it retains that many reactions, so remembering further
 * back than it can step is remembering somewhere nobody can go.
 */
export const MarkHistory = 256;

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
    /** The beat it froze at, or undefined while it is running. Frozen is not
     * stopped: the entry, and so the transport, is kept, which is the whole
     * difference between pausing and `silence`. */
    suspendedAt: number | undefined;
    /** The last beat actually delivered to `onBeat`, or -1 before the first.
     * Resuming needs the truth about what was heard rather than what the beat
     * math implies: freeze on an exact integer beat and that beat has already
     * gone out, so recomputing the count from the position would send it
     * twice. */
    emittedBeat: number;
};

/** A running entry, at the top of its piece. */
function startEntry(transport: Transport): Entry {
    return {
        transport,
        voices: [],
        finished: false,
        stopping: false,
        suspendedAt: undefined,
        emittedBeat: -1,
    };
}

export default class MusicPlayer {
    private readonly deps: PlayerDeps;
    private readonly entries = new Map<string, Entry>();
    private bus: PlayerBus | undefined = undefined;
    private cancelTimer: (() => void) | undefined = undefined;
    private pendingBeats: BeatTick[] = [];
    /** Scheduled notes waiting to become audible, for the visualizations. */
    private pendingSounds: ScheduledNote[] = [];
    private nextVoiceId = 0;
    /** Where each music was at each of the caller's history marks, oldest
     * first. Read by `positionsAt`; see it for why this is display-only. */
    private readonly marks = new Map<
        string,
        { mark: number; beat: number }[]
    >();
    private ducked = false;
    private duckDepth = 0.2;

    constructor(deps: PlayerDeps) {
        this.deps = deps;
    }

    /**
     * Reconcile the music present on stage this evaluation.
     *
     * Two independent things decide whether a music sounds: whether the stage
     * is playing, and whether the creator has held that one piece with `pause`.
     * They are applied as passes either side of reconciliation rather than as
     * decisions inside it, so `reconcile`'s table — the part that has to stay
     * testable without an ear — is untouched by pausing.
     *
     * A paused stage returns before reconciling at all, which is load-bearing
     * twice over. `present` is not stable while paused: the stage value is read
     * out of a step-indexed history that answers `undefined` when the creator
     * has stepped back past the earliest record, and reconciling an empty list
     * would `stop` every music — throwing away the very position being kept.
     * And `audio.now()` *constructs* the AudioContext, which a paused stage, a
     * preview, or a thumbnail must never be the reason for.
     */
    update(present: readonly MusicData[], playing: boolean, mark?: number) {
        if (!playing) {
            this.suspendAll();
            return;
        }

        // Thaw anything the stage or the creator is no longer holding, before
        // reconciling: a splice measures its boundary from the transport's
        // origin, and a frozen origin would put that boundary wherever the
        // clock happened to run to while the music was still.
        const incoming = new Map(present.map((data) => [data.name, data]));
        for (const [name, entry] of this.entries) {
            if (entry.suspendedAt === undefined) continue;
            // A music that has left the stage isn't in `present` and has no
            // incoming data; it still has to thaw, or draining never finishes.
            const data = incoming.get(name) ?? entry.transport.data;
            if (!data.pause) this.resume(entry);
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
                    this.entries.set(
                        name,
                        startEntry(createTransport(decision.data, now)),
                    );
                    break;
                case 'restart':
                    // A restart interrupts what is sounding rather than
                    // layering a second copy over it. This is one of only two
                    // places a note is ever cut short, and both are asked for:
                    // here the creator said replay, and in `suspend` the music
                    // was paused.
                    if (entry) this.cancelVoices(entry);
                    this.entries.set(
                        name,
                        startEntry(createTransport(decision.data, now)),
                    );
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

        // Freeze whatever the creator is holding. Every entry, including one
        // reconcile just built: `pause: ⊤` alongside `replay: ⊤` means rewound
        // to the top and held there, not started.
        for (const [name, entry] of [...this.entries])
            if (
                entry.suspendedAt === undefined &&
                (incoming.get(name)?.pause ?? false)
            )
                this.suspend(name, entry);

        if (mark !== undefined) this.sample(mark);

        if (this.hasUnfinished()) this.start();
        else this.stopTimer();
    }

    /** Record where every sounding music is at the caller's history mark. */
    private sample(mark: number) {
        const now = this.deps.audio.now();
        for (const [name, entry] of this.entries) {
            if (entry.suspendedAt !== undefined) continue;
            const samples = this.marks.get(name) ?? [];
            samples.push({ mark, beat: beatAt(entry.transport, now) });
            if (samples.length > MarkHistory) samples.shift();
            this.marks.set(name, samples);
        }
        // A music that is gone can't be stepped back to; its samples would
        // otherwise outlive it for as long as the stage runs.
        for (const name of [...this.marks.keys()])
            if (!this.entries.has(name)) this.marks.delete(name);
    }

    /** Freeze every music where it is, keeping its place. What the stage does
     * when it pauses or steps, so playing again picks the piece up rather than
     * starting it over. */
    private suspendAll() {
        // Before the clock, so a stage with no music never builds an
        // AudioContext just to pause something that was never playing.
        if (this.entries.size === 0) return;
        for (const [name, entry] of [...this.entries])
            if (entry.suspendedAt === undefined) this.suspend(name, entry);
        this.stopTimer();
    }

    /** Cut what is sounding and remember the beat it was cut on. */
    private suspend(name: string, entry: Entry) {
        // One that has left the stage is only ringing out, and freezing it
        // would strand it: its sole retirement is at the bottom of `tick`,
        // which a frozen entry never reaches. Silence is where it was headed.
        if (entry.stopping) {
            this.cancelVoices(entry);
            this.entries.delete(name);
            this.deps.onSilent?.(name);
            return;
        }

        const now = this.deps.audio.now();
        entry.suspendedAt = beatAt(entry.transport, now);
        this.cancelVoices(entry);
        // Only what has not been heard yet: a beat whose time has come has
        // already gone out to the streams, and dropping it here would leave
        // `emittedBeat` claiming something that was never taken back.
        this.pendingBeats = this.pendingBeats.filter(
            (beat) => beat.music !== name || beat.time <= now,
        );
        this.pendingSounds = this.pendingSounds.filter(
            (note) => note.music !== name || note.startTime <= now,
        );
        this.deps.onSilent?.(name);
    }

    /** Pick the piece up at the beat it froze on. */
    private resume(entry: Entry) {
        const at = entry.suspendedAt;
        if (at === undefined) return;
        const now = this.deps.audio.now();

        // Re-strike whatever was sounding, shortened to what was left of it,
        // before the cursors move past it. Without this a pause inside a held
        // chord would come back to silence until the next onset.
        for (const note of pickupNotes(entry.transport.data, at, now))
            this.playNote(entry, note);

        entry.transport = seekTransport(
            entry.transport,
            at,
            now,
            entry.emittedBeat + 1,
        );
        entry.suspendedAt = undefined;
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
            // A stopping one has left the stage and is only ringing out, and a
            // frozen one is waiting to be picked up.
            if (
                entry.finished ||
                entry.stopping ||
                entry.suspendedAt !== undefined
            )
                continue;
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
                const entry = this.entries.get(beat.music);
                if (entry !== undefined)
                    entry.emittedBeat = Math.max(entry.emittedBeat, beat.count);
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
        for (const entry of this.entries.values()) {
            // A frozen entry has nothing left to schedule and no voices left to
            // retire, so the timer can sleep until it is picked up again.
            if (entry.suspendedAt !== undefined) continue;
            if (!entry.finished || entry.voices.length > 0) return true;
        }
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

    /**
     * Cancel everything and forget where we were, so anything that comes next
     * starts from the top. Only teardown uses this now: pausing and stepping
     * `suspend` instead, keeping the transport so playing again picks the piece
     * up mid-phrase.
     *
     * That is a deliberate divergence from `Say`, which re-speaks its line from
     * the beginning on play. Re-speaking a sentence costs a second and lands
     * the listener back where they were; restarting a two-minute score does
     * neither. The shared principle is that play should resume the performance,
     * and for a sentence resuming and repeating are the same thing.
     */
    silence() {
        for (const [name, entry] of this.entries) {
            this.cancelVoices(entry);
            this.deps.onSilent?.(name);
        }
        this.entries.clear();
        this.marks.clear();
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
    /**
     * Where each music was when the program was at `mark`, for a creator
     * stepping back through evaluation history: the sheet's playhead can walk
     * back over notes it has already drawn instead of sitting wherever the
     * music happened to be frozen.
     *
     * Display only, and deliberately so — pressing play returns the evaluator
     * to the present before resuming (`Evaluator.play`), so seeking the *sound*
     * backwards would leave the score trailing the program it is scoring.
     *
     * The window is bounded to match the evaluator's own: it keeps 256
     * reactions, which for a `Time()`-driven program is about eight seconds at
     * the default frequency and half that at 60fps. Stepping back further than
     * we sampled clamps to the oldest sample rather than guessing.
     */
    positionsAt(mark: number): Map<string, number> {
        const positions = new Map<string, number>();
        for (const [name, samples] of this.marks) {
            if (samples.length === 0) continue;
            let found = samples[0].beat;
            for (const sample of samples) {
                if (sample.mark > mark) break;
                found = sample.beat;
            }
            positions.set(name, found);
        }
        return positions;
    }

    positions(): Map<string, { beat: number; data: MusicData }> {
        const now = this.deps.audio.now();
        const positions = new Map<string, { beat: number; data: MusicData }>();
        for (const [name, entry] of this.entries)
            positions.set(name, {
                // A frozen music holds its playhead: `beatAt` would keep
                // reading the running audio clock and walk the head off the
                // end of a piece nobody is listening to.
                beat: entry.suspendedAt ?? beatAt(entry.transport, now),
                data: entry.transport.data,
            });
        return positions;
    }
}
