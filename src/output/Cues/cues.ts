import type { Contact } from '@output/Cues/contacts';
import type { StreamKind } from '@values/StreamValue';

/**
 * The policy behind audible re-evaluation cues (#537): what each cue sounds
 * like, and which ones are allowed to sound. Pure and clock-injectable, so the
 * rules are testable; the Web Audio graph that renders a `CueSpec` lives beside
 * it in `cueAudio.ts`.
 */

/**
 * What an animation cue names: arriving at a pose, coming round the loop again,
 * or the animation state changing. `pose` carries its own pitch, pan, and gain
 * from what the pose actually does (see figure.ts); the spec below is its
 * timbre and its baseline.
 */
export type AnimationCue = 'pose' | 'loop' | 'entering' | 'moving' | 'exiting';

/** What a cue names: the stream that reacted, the start of an evaluation, or
 * something an animation did. */
export type CueEvent = StreamKind | 'start' | AnimationCue;

export type CueSpec = {
    /** Noise for the world's sensors, tone for things a creator did. */
    source: 'tone' | 'noise';
    /** Pitch, or the band center of a noise burst. */
    hz: number;
    /** The second pulse's frequency relative to the first; 1 is flat. */
    bend: number;
    /** How long each pulse lasts. Never below MinimumCueMs. */
    ms: number;
    pulses: 1 | 2;
    /** 0-1 on the cue bus, which is independent of the music's volume. */
    gain: number;
    /** The minimum time between two cues of this kind — the rate cap that
     * keeps a stream firing every frame from becoming a buzz. */
    floorMs: number;
    /** Vibration length where the device supports it; 0 for no haptic. */
    haptic: number;
    /**
     * How many of this kind may sound at once. Absent means one, which is right
     * for a stream that fired repeatedly in an instant — hearing the same tick
     * four times says nothing the first didn't. It is wrong for four things
     * landing together, which is four events, so `collision` is polyphonic.
     */
    polyphony?: number;
};

/**
 * A cue has to be long enough to have an identity: below about 35ms a burst is
 * heard as an undifferentiated click, and the whole point is that a creator can
 * tell which stream reacted. This is the floor for audibility.
 */
export const MinimumCueMs = 35;

/** The minimum gap between any two cues, so simultaneous reactions are heard as
 * separate events rather than a smear. Cues in one reaction are staggered by
 * this rather than dropped. */
export const CueSpacingMs = 40;

/**
 * How many streams of one reaction are cued. Matches the Timeline's own
 * `changes.slice(0, 3)` display cap, so what is heard and what is drawn agree,
 * and so one reaction can never produce a chord.
 */
export const MaxCuesPerReaction = 3;

/**
 * How far a cue may be pushed into the future by the stagger before it is
 * dropped instead. A cue arriving much later than the thing it names is worse
 * than silence — the creator would be listening to the past.
 */
export const MaxCueLagMs = 200;

/** How many contacts of one burst are heard. Four is enough for a landing to
 * read as several things rather than one, and few enough that a pile-up is a
 * handful of clicks rather than a wall. */
export const ContactPolyphony = 4;

/** How many pose cues one animation may sound per iteration. A figure is a
 * phrase, not a scale: past about eight notes nothing is remembered, and the
 * largest changes are the ones worth keeping. */
export const MaxCuesPerFigure = 8;

/** The minimum gap between two animation cues, whoever they belong to. Where two
 * would collide the smaller change loses, so a busy stage thins to its most
 * salient motion rather than summing into a wall. */
export const FigureSpacingMs = 50;

/**
 * A sound for every stream, and one for the start of an evaluation.
 *
 * Two constraints hold across the table. Frequencies sit off the 12-TET grid
 * and out of simple ratios with each other, so a cue is never mistaken for a
 * note in the creator's own composition. And no two entries are identical:
 * a cue names a stream, so two streams that sound alike is a defect
 * (`cues.test.ts` checks both).
 *
 * Total over `CueEvent`, so a new stream is a type error until it has a sound.
 */
export const Cues: Record<CueEvent, CueSpec> = {
    // The start of an evaluation: the only rising two-tone cue, so "the program
    // began again" is never confused with an input.
    start: {
        source: 'tone',
        hz: 587,
        bend: 1.53,
        ms: 70,
        pulses: 2,
        gain: 0.22,
        floorMs: 0,
        haptic: 18,
    },

    // Discrete input — a creator acted, so every one of these cues, with no
    // rate cap at all.
    key: {
        source: 'tone',
        hz: 2137,
        bend: 1,
        ms: 38,
        pulses: 1,
        gain: 0.18,
        floorMs: 0,
        haptic: 8,
    },
    button: {
        source: 'tone',
        hz: 1747,
        bend: 1,
        ms: 42,
        pulses: 1,
        gain: 0.18,
        floorMs: 0,
        haptic: 8,
    },
    choice: {
        source: 'tone',
        hz: 1901,
        bend: 1.19,
        ms: 40,
        pulses: 2,
        gain: 0.17,
        floorMs: 0,
        haptic: 10,
    },
    chat: {
        source: 'tone',
        hz: 1483,
        bend: 0.84,
        ms: 46,
        pulses: 2,
        gain: 0.17,
        floorMs: 0,
        haptic: 10,
    },
    webpage: {
        source: 'tone',
        hz: 1279,
        bend: 0.71,
        ms: 52,
        pulses: 2,
        gain: 0.16,
        floorMs: 0,
        haptic: 10,
    },

    // Continuous input — a creator is still driving these, but a pointer moves
    // far faster than it can be heard, so they are capped rather than free.
    pointer: {
        source: 'tone',
        hz: 419,
        bend: 1,
        ms: 36,
        pulses: 1,
        gain: 0.1,
        floorMs: 150,
        haptic: 0,
    },
    placement: {
        source: 'tone',
        hz: 487,
        bend: 1,
        ms: 38,
        pulses: 1,
        gain: 0.11,
        floorMs: 120,
        haptic: 0,
    },

    // Sensors — the world, not the creator. Noise rather than pitch, since
    // these arrive every frame and a pitched cue at that rate is a drone.
    camera: {
        source: 'noise',
        hz: 1601,
        bend: 1,
        ms: 60,
        pulses: 1,
        gain: 0.12,
        floorMs: 500,
        haptic: 0,
    },
    face: {
        source: 'noise',
        hz: 2311,
        bend: 1,
        ms: 55,
        pulses: 1,
        gain: 0.12,
        floorMs: 400,
        haptic: 0,
    },
    hand: {
        source: 'noise',
        hz: 1949,
        bend: 1,
        ms: 55,
        pulses: 1,
        gain: 0.12,
        floorMs: 400,
        haptic: 0,
    },
    objects: {
        source: 'noise',
        hz: 1187,
        bend: 1,
        ms: 58,
        pulses: 1,
        gain: 0.12,
        floorMs: 400,
        haptic: 0,
    },
    contour: {
        source: 'noise',
        hz: 977,
        bend: 1,
        ms: 58,
        pulses: 1,
        gain: 0.12,
        floorMs: 400,
        haptic: 0,
    },
    motion: {
        source: 'noise',
        hz: 643,
        bend: 1,
        ms: 70,
        pulses: 1,
        gain: 0.12,
        floorMs: 300,
        haptic: 0,
    },
    volume: {
        source: 'noise',
        hz: 787,
        bend: 1,
        ms: 60,
        pulses: 1,
        gain: 0.12,
        floorMs: 400,
        haptic: 0,
    },
    pitch: {
        source: 'noise',
        hz: 1361,
        bend: 1,
        ms: 60,
        pulses: 1,
        gain: 0.12,
        floorMs: 400,
        haptic: 0,
    },
    speech: {
        source: 'noise',
        hz: 2591,
        bend: 1,
        ms: 65,
        pulses: 1,
        gain: 0.13,
        floorMs: 300,
        haptic: 0,
    },

    // Rhythm and world events — dry, low thumps, so they read as impacts.
    beat: {
        source: 'tone',
        hz: 211,
        bend: 1,
        ms: 55,
        pulses: 1,
        gain: 0.16,
        floorMs: 120,
        haptic: 12,
    },
    collision: {
        source: 'tone',
        hz: 173,
        bend: 0.79,
        ms: 60,
        pulses: 1,
        gain: 0.16,
        // The floor between bursts, not between contacts: the contacts of one
        // burst sound together, and this is what keeps a bouncing stage from
        // becoming a continuous rattle.
        floorMs: 60,
        haptic: 12,
        polyphony: ContactPolyphony,
    },
    scene: {
        source: 'tone',
        hz: 293,
        bend: 1.27,
        ms: 65,
        pulses: 2,
        gain: 0.15,
        floorMs: 0,
        haptic: 12,
    },

    // Clocks tick forever, so theirs are the quietest cues and the most
    // heavily capped: enough to know the program is alive, not enough to sit on.
    time: {
        source: 'tone',
        hz: 3067,
        bend: 1,
        ms: 35,
        pulses: 1,
        gain: 0.06,
        floorMs: 1000,
        haptic: 0,
    },
    now: {
        source: 'tone',
        hz: 2749,
        bend: 1,
        ms: 35,
        pulses: 1,
        gain: 0.06,
        floorMs: 1000,
        haptic: 0,
    },

    // Animation. A soft ping with a gentle attack rather than a click, so a
    // figure reads as melodic where a collision reads as an impact — and, with
    // pitch and pan coming from the pose itself, so that a repeating sequence
    // is heard as the same phrase recurring.
    pose: {
        source: 'tone',
        hz: 587,
        bend: 1,
        ms: 45,
        pulses: 1,
        gain: 0.14,
        floorMs: 0,
        haptic: 0,
        polyphony: MaxCuesPerFigure,
    },
    /** Coming round again: a low, quiet marker, so repetition can be counted
     *  without competing with the figure it introduces. */
    loop: {
        source: 'tone',
        hz: 131,
        bend: 1,
        ms: 55,
        pulses: 1,
        gain: 0.09,
        floorMs: 0,
        haptic: 0,
    },
    entering: {
        source: 'tone',
        hz: 659,
        bend: 1.41,
        ms: 42,
        pulses: 2,
        gain: 0.13,
        floorMs: 120,
        haptic: 0,
    },
    moving: {
        source: 'tone',
        hz: 523,
        bend: 1,
        ms: 40,
        pulses: 1,
        gain: 0.1,
        floorMs: 200,
        haptic: 0,
    },
    exiting: {
        source: 'tone',
        hz: 659,
        bend: 0.66,
        ms: 42,
        pulses: 2,
        gain: 0.13,
        floorMs: 120,
        haptic: 0,
    },

    /** A `∆` reaction's own stream, which rarely surfaces as a cause. */
    reaction: {
        source: 'tone',
        hz: 907,
        bend: 1,
        ms: 40,
        pulses: 1,
        gain: 0.1,
        floorMs: 250,
        haptic: 0,
    },
};

/**
 * Which switch governs a cue.
 *
 * Three, because the three sources are three different things happening at
 * three different rates: a re-evaluation is the program acting, a contact is
 * the stage's physics (which sounds whether or not the program evaluates
 * `Collision()`), and an animation is continuous motion. A landing is twenty
 * cues in a second where a keypress is one, so someone who wants to hear their
 * keys must be able to say so without their stage clattering.
 *
 * None of them is a master switch over the others: a row that means anything
 * other than exactly what its label says is a row that reads as broken.
 */
export type CueGate = 'evaluation' | 'contact' | 'animation';

const AnimationCues: Set<string> = new Set([
    'pose',
    'loop',
    'entering',
    'moving',
    'exiting',
]);

export function gateOf(event: CueEvent): CueGate {
    // Only a contact ever schedules `collision`: the reaction path skips that
    // kind on purpose, since the contact is the event and the stream's reaction
    // only its consequence.
    if (event === 'collision') return 'contact';
    return AnimationCues.has(event) ? 'animation' : 'evaluation';
}

/** A cue that passed, and how long to wait before sounding it. */
export type ScheduledCue = {
    event: CueEvent;
    offsetMs: number;
    /** 0-1, for an event that has a magnitude — how hard a contact was. Absent
     * where the event either happened or didn't, which is most of them. */
    strength?: number;
};

/**
 * Decides which cues sound and when.
 *
 * Leading edge, never trailing: the first event of a burst sounds immediately,
 * and everything inside its floor is *dropped* rather than queued. A queued cue
 * would arrive after the thing it describes, which is worse than not hearing
 * it — the creator would be listening to the past.
 */
export default class CueScheduler {
    private readonly now: () => number;
    /** When each kind last sounded, for its floor. */
    private readonly sounded = new Map<CueEvent, number>();
    /** The earliest a cue may sound without crowding the last one. */
    private free = Number.NEGATIVE_INFINITY;
    /** The last reaction cued per evaluator, so two drivers watching one
     * evaluator cue it once. Weak, since evaluators are replaced on every
     * revision and must not be held alive by this. */
    private readonly cued = new WeakMap<object, number>();

    constructor(now: () => number = () => Date.now()) {
        this.now = now;
    }

    /**
     * Cue a reaction. Returns what should actually sound, in order, with the
     * delay each should wait — empty when this reaction was already cued or
     * everything in it was inside its floor.
     */
    reaction(
        evaluator: object,
        stepIndex: number,
        events: CueEvent[],
    ): ScheduledCue[] {
        if (this.cued.get(evaluator) === stepIndex) return [];
        this.cued.set(evaluator, stepIndex);

        const now = this.now();
        const scheduled: ScheduledCue[] = [];
        for (const event of events.slice(0, MaxCuesPerReaction)) {
            const last = this.sounded.get(event);
            if (last !== undefined && now - last < Cues[event].floorMs)
                continue;
            const at = Math.max(now, this.free);
            if (at - now > MaxCueLagMs) continue;
            // Floors are measured from when an event *happened*, not from when
            // its cue was staggered to: otherwise a burst of floorless events
            // (every keypress) would silence itself with its own stagger.
            this.sounded.set(event, now);
            this.free = at + CueSpacingMs;
            scheduled.push({ event, offsetMs: at - now });
        }
        return scheduled;
    }

    /**
     * Cue a burst of physics contacts.
     *
     * Unlike a reaction's cues, these sound *together* rather than staggered:
     * the stagger exists to separate cues that name different things, and
     * spreading four clicks of one landing across 120ms turns it into a
     * stutter. The loudest few are kept, since a burst is heard as its front.
     */
    contacts(contacts: Contact[]): ScheduledCue[] {
        if (contacts.length === 0) return [];
        const spec = Cues.collision;
        const now = this.now();
        const last = this.sounded.get('collision');
        if (last !== undefined && now - last < spec.floorMs) return [];
        this.sounded.set('collision', now);
        // The burst occupies the spacing window once, however many contacts of
        // it are heard, so a following cue of another kind still lands clear.
        this.free = now + CueSpacingMs;
        return [...contacts]
            .sort((a, b) => b.strength - a.strength)
            .slice(0, spec.polyphony ?? 1)
            .map((contact) => ({
                event: 'collision',
                offsetMs: 0,
                strength: contact.strength,
            }));
    }
}
