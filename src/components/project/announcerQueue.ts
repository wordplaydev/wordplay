import type LanguageCode from '@locale/LanguageCode';
import { writable, type Writable } from 'svelte/store';
import Announcement from './Announcement';

/**
 * True while something is being presented to the screen reader. Music ducks
 * against this, so a blind creator never has to choose between hearing their
 * program and hearing their screen reader. The queue already knows when it is
 * presenting — it paces by reading time — so this just exposes it; nothing
 * about announcement behavior depends on it.
 *
 * Only the paced channel drives this. Immediate announcements (character
 * echo, caret movement) have no end event and arrive faster than the duck
 * ramps, so ducking on them would pump the gain and then never restore.
 */
export const announcerPresenting: Writable<boolean> = writable(false);

/**
 * The Announcer's priority model. Every announcement kind is registered in
 * one of four lanes, which determine how it competes with other
 * announcements for the single live region (see CLAUDE.md's Screen-reader
 * announcements section):
 *
 * - `echo` — per-keystroke character echo. Strict FIFO with brief fixed
 *   pacing: every character must be heard, in order, with minimal latency.
 * - `interrupt` — "you acted and it failed" or "the app failed". Presents
 *   immediately (cancels the current hold), clears stale coalesced state,
 *   and re-presents even when the text is identical. Queued and echo items
 *   are preserved — an interrupt jumps ahead, it never discards guaranteed
 *   announcements.
 * - `queued` — discrete action results. FIFO, never dropped, paced by
 *   reading time; only consecutive duplicates are deduped at enqueue.
 * - `coalesce` — continuous streams (caret moves, drags, animation) where
 *   only the latest state matters. One latest-wins slot per kind; a slot
 *   whose text matches what's already presented is skipped.
 *
 * Drain priority is interrupt → echo → queued → coalesce. Queued before
 * coalesce is the starvation guard: a continuous stream can never starve a
 * discrete action's feedback, and waiting costs coalesce nothing since its
 * slots always hold the latest value.
 */
export type AnnouncementLane = 'echo' | 'interrupt' | 'queued' | 'coalesce';

/** A lane, optionally marked `immediate` (see isImmediate). */
type LaneRegistration =
    AnnouncementLane | { lane: AnnouncementLane; immediate?: true };

/** Adding an announcement kind requires registering it here with a lane. */
const Lanes = {
    // echo — main-flow typing is echoed natively by the editor's mirrored
    // textarea (#1248); `type` now carries only the echoes that can't route
    // natively (tab insert, single-character node deletions). Those are rare,
    // so the paced region keeps up — and unlike the assertive channel, it
    // doesn't chime.
    type: 'echo',
    // Stage key input is paced, not immediate: a creator knows which key they
    // pressed, so echoing it must never interrupt the description of what the
    // program did in response. Assertive echo was cutting off stage output
    // descriptions mid-sentence (and chiming on every key).
    keyinput: 'coalesce',
    // interrupt — a failure the creator must hear at once
    ignored: { lane: 'interrupt', immediate: true },
    banner: { lane: 'interrupt', immediate: true },
    // The tutorial refusing to advance until a tour is taken. Interrupt rather
    // than queued because it answers a keystroke that did nothing, and because
    // this lane re-presents identical text: the refusal is the same event every
    // time, so the usual "vary the words or it's heard once" fix doesn't apply.
    'tutorial-tour': { lane: 'interrupt', immediate: true },
    // queued
    fold: 'queued',
    selection: 'queued',
    'model-loading': 'queued',
    // Translation start, finish, and failure: discrete results a creator asked
    // for, so they are queued rather than coalesced and never dropped.
    translation: 'queued',
    'project-mode': 'queued',
    'tutorial-dialog': 'queued',
    // Music that can't be heard — no audio context, or the viewer muted it —
    // is described instead, so a value is never silent in both channels at
    // once. Announced on entry, which is a real event, since a description is
    // constant text and would go unheard if it recurred.
    'music-description': 'queued',
    /** A note added, removed, or moved in the music editor. */
    'note-edit': 'queued',
    'tour-step': 'queued',
    // Choosing an example in the landing page's carousel. Queued rather than
    // coalesced: each choice is a discrete answer to a press, and naming the
    // example is what keeps consecutive choices from deduping into silence.
    tour: 'queued',
    collaborator: 'queued',
    /** Opening or leaving a chat thread, and the result of pressing the reply
     *  control. Discrete answers to a press, so queued rather than coalesced;
     *  each names the thread's author and reply count, since the queued lane
     *  drops a repeat of identical text. */
    'chat-thread': 'queued',
    /** Adding or taking back a reaction, and a refusal when a message has
     *  collected all the emoji it may. Names the emoji and the new count for
     *  the same reason. */
    'chat-reaction': 'queued',
    /** Entering and leaving code-reference mode, attaching a reference to a
     *  message, and resolving one. Names the lines involved. */
    'chat-reference': 'queued',
    /** A committed change to how projects are organized: one moved into or out
     *  of a folder, or a folder created, expanded, collapsed, selected, or
     *  deleted. Each is a discrete result, so none may be dropped. */
    'project-folder': 'queued',
    notification: 'queued',
    update: 'queued',
    'delete-account-confirm': 'queued',
    'move-mode': 'queued',
    /** Whether the camera has left anything on the stage — a discrete state change on
     *  both edges, not the latest of a stream. */
    'stage-visibility': 'queued',
    /** Confirmations that a command did something (see Command.feedback). */
    command: 'queued',
    /** A discrete result in the character editor — a point added, a segment
     *  straightened, an edit undone. Never dropped, since each is its own event. */
    'character-edit': 'queued',
    // coalesce
    // The caret must keep up with navigation, and outrank the screen
    // reader's own chatter, so it doesn't wait behind paced announcements.
    caret: { lane: 'coalesce', immediate: true },
    value: 'coalesce',
    color: 'coalesce',
    'stage-entered': 'coalesce',
    'stage-changed': 'coalesce',
    'stage-moved': 'coalesce',
    /** What an output being moved on stage is lined up with (#117). A pointer drag
     *  streams it and only the latest constraint matters; it is separate from
     *  'stage-moved' so a drag's snapping can't displace the program's own move
     *  descriptions while playing. */
    'stage-snap': 'coalesce',
    /** The stage zoom level, which a held key, a wheel, or a pinch streams; only the
     *  latest matters. Its own kind rather than 'command-state', whose single slot the
     *  editor's step feedback owns — a stage zoom would overwrite a step. */
    'stage-zoom': 'coalesce',
    'character-selection': 'coalesce',
    'drawing-cursor': 'coalesce',
    /** Where the character editor's cursor, selection, or path handle is now, and what
     *  a drag is drawing. Held keys and drags stream these, so only the latest matters. */
    'character-point': 'coalesce',
    /** How far back or forward through the character editor's history an undo has got.
     *  A held undo streams it, and only where it landed matters. */
    'character-history': 'coalesce',
    'canvas-moved': 'coalesce',
    'howto-moved': 'coalesce',
    /** Which folder a project being moved on the projects page would land in.
     *  A held arrow key and a pointer drag both stream this, so only the
     *  latest destination matters. */
    'project-move': 'coalesce',
    /** Command feedback whose value changes as a key repeats (zoom, step). */
    'command-state': 'coalesce',
    /** How far a translation has got. A continuous stream where only the latest
     *  count matters, and separate from 'translation' so a progress line can't
     *  displace the start or finish line it sits between. */
    'translation-progress': 'coalesce',
} satisfies Record<string, LaneRegistration>;

export type AnnouncementKind = keyof typeof Lanes;

function registrationOf(kind: AnnouncementKind): LaneRegistration {
    return Lanes[kind];
}

export function laneOf(kind: AnnouncementKind): AnnouncementLane {
    const registration = registrationOf(kind);
    return typeof registration === 'string' ? registration : registration.lane;
}

/**
 * Whether this kind is spoken the moment it arrives, in its own assertive
 * region, instead of waiting its turn in the paced one.
 *
 * Typing echo and caret movement are direct responses to a keystroke: held
 * behind a polite queue they arrive late, and the screen reader's own
 * "you are currently on…" chatter buries them. Failures interrupt for the
 * same reason. Everything else is paced, so a burst of status can't talk
 * over itself.
 */
export function isImmediate(kind: AnnouncementKind): boolean {
    const registration = registrationOf(kind);
    return typeof registration === 'string'
        ? false
        : registration.immediate === true;
}

/** Which live region an announcement is presented in. */
export type AnnouncementChannel = 'immediate' | 'paced';

export function channelOf(kind: AnnouncementKind): AnnouncementChannel {
    return isImmediate(kind) ? 'immediate' : 'paced';
}

/** ms between character-echo announcements. */
export const ECHO_HOLD = 50;
/**
 * ms the region holds each non-echo announcement per character of text —
 * roughly one fifth of a 3-words-per-second (5 chars/word) reading rate:
 * long enough for the screen reader to begin the utterance, short enough
 * that the queue keeps up.
 */
export const HOLD_PER_CHARACTER = 13;
export const MIN_HOLD = 200;
export const MAX_HOLD = 2000;

/** How long to hold an announcement before presenting the next. */
export function holdFor(announcement: Announcement): number {
    if (laneOf(announcement.kind) === 'echo') return ECHO_HOLD;
    return Math.min(
        MAX_HOLD,
        Math.max(MIN_HOLD, announcement.text.length * HOLD_PER_CHARACTER),
    );
}

/**
 * The pure queueing policy behind Announcer.svelte, extracted so the lanes,
 * pacing, and dedupe rules are unit-testable. The component supplies a
 * `present` callback that puts an announcement into the live region; timers
 * are injectable for tests.
 */
export class AnnouncerQueue {
    private readonly present: (
        announcement: Announcement,
        channel: AnnouncementChannel,
    ) => void;
    private readonly setTimer: (callback: () => void, ms: number) => () => void;

    private echo: Announcement[] = [];
    private interrupts: Announcement[] = [];
    private queued: Announcement[] = [];
    private coalesced = new Map<AnnouncementKind, Announcement>();

    /** What the live region is currently showing, for coalesce dedupe. */
    private presented: Announcement | undefined = undefined;
    /** Cancels the pending hold timer, if any. */
    private cancelTimer: (() => void) | undefined = undefined;
    /** The last text enqueued to the queued lane, for consecutive dedupe. */
    private lastQueuedText: string | undefined = undefined;

    /** The last text presented immediately, so an unchanged caret position
     *  doesn't repeat. Echo never dedupes: two of the same key are two events. */
    private presentedImmediate: string | undefined = undefined;

    constructor(options: {
        present: (
            announcement: Announcement,
            channel: AnnouncementChannel,
        ) => void;
        setTimer?: (callback: () => void, ms: number) => () => void;
    }) {
        this.present = options.present;
        this.setTimer =
            options.setTimer ??
            ((callback, ms) => {
                const timer = setTimeout(callback, ms);
                return () => clearTimeout(timer);
            });
    }

    announce(
        kind: AnnouncementKind,
        language: LanguageCode | undefined,
        text: string,
    ) {
        const announcement = new Announcement(kind, language, text);

        // Immediate kinds answer a keystroke, so they're spoken at once in
        // their own assertive region rather than queued behind paced status.
        // The newest replaces whatever is there — a screen reader interrupts
        // itself, which is exactly what a text field does when you type fast.
        if (isImmediate(kind)) {
            if (laneOf(kind) === 'interrupt') {
                // Continuous state is stale next to a failure; the streams
                // that feed those slots regenerate them immediately.
                this.coalesced.clear();
            }
            // Only the caret dedupes: landing on the same position twice says
            // nothing new. The same character typed twice is two events, and
            // acting twice on a read-only source is two failures — both must
            // be heard each time.
            if (
                laneOf(kind) !== 'coalesce' ||
                this.presentedImmediate !== announcement.text
            ) {
                this.presentedImmediate = announcement.text;
                this.present(announcement, 'immediate');
            }
            return;
        }

        switch (laneOf(kind)) {
            case 'echo':
                this.echo.push(announcement);
                break;
            case 'interrupt':
                this.interrupts.push(announcement);
                // Continuous state is stale next to a failure; the streams
                // that feed these slots regenerate them immediately.
                this.coalesced.clear();
                // Don't wait out the current hold.
                this.cancelHold();
                break;
            case 'queued':
                if (text !== this.lastQueuedText) {
                    this.queued.push(announcement);
                    this.lastQueuedText = text;
                }
                break;
            case 'coalesce':
                // Map.set on an existing key replaces the value but keeps
                // insertion order, so hot slots take turns rather than the
                // most recently updated one always winning.
                this.coalesced.set(kind, announcement);
                break;
        }
        // If a hold is in progress its timer will drain; otherwise drain now.
        if (this.cancelTimer === undefined) this.drain();
    }

    /** Cancel any pending presentation; for the component's onDestroy. */
    stop() {
        this.cancelHold();
        announcerPresenting.set(false);
        this.presentedImmediate = undefined;
        this.echo = [];
        this.interrupts = [];
        this.queued = [];
        this.coalesced.clear();
    }

    private cancelHold() {
        if (this.cancelTimer !== undefined) {
            this.cancelTimer();
            this.cancelTimer = undefined;
        }
    }

    /** Present the next pending announcement, if any, and schedule the next
     *  drain after its hold. Skipped (deduped) items don't end the drain —
     *  that would strand the rest of the queue with no timer to revive it. */
    private drain() {
        let next = this.next();
        while (next !== undefined && this.isRedundant(next)) next = this.next();
        if (next === undefined) {
            announcerPresenting.set(false);
            return;
        }
        this.presented = next;
        announcerPresenting.set(true);
        this.present(next, 'paced');
        this.cancelTimer = this.setTimer(() => {
            this.cancelTimer = undefined;
            this.drain();
        }, holdFor(next));
    }

    /** Lane priority: interrupt → echo → queued → coalesce. */
    private next(): Announcement | undefined {
        const interrupt = this.interrupts.shift();
        if (interrupt !== undefined) return interrupt;
        const echo = this.echo.shift();
        if (echo !== undefined) return echo;
        const queued = this.queued.shift();
        if (queued !== undefined) return queued;
        const first = this.coalesced.entries().next();
        if (!first.done) {
            this.coalesced.delete(first.value[0]);
            return first.value[1];
        }
        return undefined;
    }

    /** Only coalesced announcements dedupe against the presented text:
     *  echoed characters must repeat, queued items deduped at enqueue, and
     *  interrupts always re-present. */
    private isRedundant(announcement: Announcement): boolean {
        return (
            laneOf(announcement.kind) === 'coalesce' &&
            this.presented?.text === announcement.text
        );
    }
}
