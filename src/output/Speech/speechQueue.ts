/**
 * The policy behind the app's single speech synthesizer, kept apart from the
 * browser the way `announcerQueue.ts` is kept apart from `Announcer.svelte`:
 * every decision about what is spoken and what is cut is a pure function over
 * `SpeechState`, and the shell in `speech.ts` does nothing but apply the
 * effects to `window.speechSynthesis`.
 *
 * The whole design follows from one platform fact: `speechSynthesis` is a
 * singleton with one global queue, and `cancel()` empties all of it. There is
 * no per-utterance cancellation and no second synthesizer. So this queue
 * hands the platform **at most one utterance at a time** and keeps the rest
 * itself. Cancelling one source while another is speaking is then a splice of
 * our own array rather than a platform call that would silence both.
 */

/** How a request competes for the single global voice. */
export type SpeechPriority =
    /**
     * Must be heard now or not at all — a track's spoken text, which belongs
     * to a beat. Preempts whatever is speaking, because arriving late is the
     * one failure the feature cannot survive: tracks loop, so a spoken line
     * that waits its turn drifts further behind on every pass and never
     * recovers.
     */
    | 'deadline'
    /**
     * Should be heard whole — a `Say`, which answers a change in a program
     * rather than a moment in a piece. Waits its turn.
     */
    | 'flow';

/** One thing to speak, with everything the platform needs already resolved. */
export type Utterance = {
    /** Who asked, for scoped cancellation: `SaySource`, or `music:<name>`. */
    source: string;
    text: string;
    /** BCP-47 from the text's language tag; undefined lets the viewer's win. */
    lang: string | undefined;
    /** Already clamped to the API's range; see `clampRate`. */
    rate: number;
    /** 0–1, already clamped. */
    volume: number;
    priority: SpeechPriority;
    /**
     * Whether a caption should show these words. Defaults to shown. A `Say`
     * carried by a `Phrase`'s speech bubble sets this false: the bubble is
     * already this speech's visual rendering, attached to the speaker, so a
     * floor caption of it would show the same line twice.
     */
    captioned?: boolean;
};

/**
 * One utterance this queue is tracking. Position within a batch is just the
 * order of `waiting`, so nothing has to carry its own index.
 */
export type Speaking = { id: number; utterance: Utterance };

export type SpeechState = {
    /** The one utterance handed to the platform, if any. */
    current: Speaking | undefined;
    waiting: Speaking[];
    nextId: number;
};

export type SpeechEffect =
    { kind: 'speak'; speaking: Speaking } | { kind: 'cancel' };

export type SpeechChange = { next: SpeechState; effects: SpeechEffect[] };

/** The API's documented range for `SpeechSynthesisUtterance.rate`. */
export const MinRate = 0.1;
export const MaxRate = 10;

export function clampRate(rate: number): number {
    if (!Number.isFinite(rate)) return 1;
    return Math.min(MaxRate, Math.max(MinRate, rate));
}

export function emptySpeech(): SpeechState {
    return { current: undefined, waiting: [], nextId: 0 };
}

/**
 * Start whatever should be sounding now.
 *
 * A waiting deadline always wins, and only the **newest** one is spoken: an
 * older deadline is already late, and saying it now would put its words on a
 * beat that has gone by. Everything else is first in, first out.
 */
function drain(state: SpeechState): SpeechChange {
    const deadline = [...state.waiting]
        .reverse()
        .find((waiting) => waiting.utterance.priority === 'deadline');

    if (deadline !== undefined)
        return {
            next: {
                ...state,
                current: deadline,
                // Every deadline goes, not just the one spoken — the ones
                // passed over are stale by definition.
                waiting: state.waiting.filter(
                    (waiting) => waiting.utterance.priority !== 'deadline',
                ),
            },
            effects: [
                ...(state.current === undefined
                    ? []
                    : [{ kind: 'cancel' as const }]),
                { kind: 'speak', speaking: deadline },
            ],
        };

    const [head, ...rest] = state.waiting;
    if (state.current !== undefined || head === undefined)
        return { next: state, effects: [] };

    return {
        next: { ...state, current: head, waiting: rest },
        effects: [{ kind: 'speak', speaking: head }],
    };
}

/** Drop everything `source` has pending, silencing it if it holds the voice. */
function withoutSource(
    state: SpeechState,
    source: string,
): { next: SpeechState; cancelled: boolean } {
    const waiting = state.waiting.filter(
        (waiting) => waiting.utterance.source !== source,
    );
    return state.current?.utterance.source === source
        ? { next: { ...state, current: undefined, waiting }, cancelled: true }
        : { next: { ...state, waiting }, cancelled: false };
}

/**
 * Speak these, in order, replacing everything `source` had pending.
 *
 * Replacing rather than appending is what makes a re-evaluated program sound
 * right: a `Say` whose text changed is no longer the `Say` that was queued,
 * and a track's next line supersedes the line before it.
 */
export function requested(
    state: SpeechState,
    source: string,
    utterances: readonly Utterance[],
): SpeechChange {
    const cleared = withoutSource(state, source);

    let id = cleared.next.nextId;
    const added: Speaking[] = [];
    for (const utterance of utterances) {
        // Silent or empty text would still occupy the one global slot and
        // still have to be waited out, which is worse than never saying it.
        if (utterance.text.trim().length === 0 || utterance.volume <= 0)
            continue;
        added.push({ id: id++, utterance });
    }

    const drained = drain({
        ...cleared.next,
        waiting: [...cleared.next.waiting, ...added],
        nextId: id,
    });

    return {
        next: drained.next,
        effects: [
            ...(cleared.cancelled ? [{ kind: 'cancel' as const }] : []),
            ...drained.effects,
        ],
    };
}

/** Forget everything for one source, stopping it if it is the one speaking. */
export function cancelled(state: SpeechState, source: string): SpeechChange {
    const cleared = withoutSource(state, source);
    const drained = drain(cleared.next);
    return {
        next: drained.next,
        effects: [
            ...(cleared.cancelled ? [{ kind: 'cancel' as const }] : []),
            ...drained.effects,
        ],
    };
}

/**
 * The platform reported this utterance ended, errored, or was cancelled.
 *
 * An id we are no longer holding is ignored, and that guard is load-bearing:
 * `cancel()` fires `onend` for the utterance it just killed, which arrives
 * *after* we have already started its replacement. Acting on it would stop
 * the replacement a moment after starting it.
 */
export function finished(state: SpeechState, id: number): SpeechChange {
    if (state.current?.id !== id) return { next: state, effects: [] };
    return drain({ ...state, current: undefined });
}
