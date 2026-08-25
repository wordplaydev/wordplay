import { describe, expect, test } from 'vitest';
import CueScheduler, {
    ContactPolyphony,
    gateOf,
    CueSpacingMs,
    Cues,
    MaxCueLagMs,
    MaxCuesPerReaction,
    MinimumCueMs,
    type CueEvent,
} from './cues';

/** A stand-in for an evaluator, which the scheduler only uses as an identity. */
function evaluator(): object {
    return {};
}

/** A clock the tests move by hand. */
function clock(): { now: () => number; advance: (ms: number) => void } {
    let time = 0;
    return {
        now: () => time,
        advance: (ms: number) => {
            time += ms;
        },
    };
}

describe('the cue vocabulary', () => {
    test('no two events sound alike', () => {
        // A cue names a stream, so two streams sharing a sound is a defect,
        // not a stylistic choice.
        const sounds = Object.values(Cues).map((spec) => JSON.stringify(spec));
        expect(new Set(sounds).size).toBe(sounds.length);
    });

    test('every cue is long enough to have an identity', () => {
        for (const [event, spec] of Object.entries(Cues))
            expect(spec.ms, event).toBeGreaterThanOrEqual(MinimumCueMs);
    });

    test('every cue is audible but quiet', () => {
        for (const [event, spec] of Object.entries(Cues)) {
            expect(spec.gain, event).toBeGreaterThan(0);
            expect(spec.gain, event).toBeLessThanOrEqual(0.25);
        }
    });
});

describe('the scheduler', () => {
    test('sounds the first event of a burst immediately', () => {
        const time = clock();
        const scheduler = new CueScheduler(time.now);
        const source = evaluator();
        expect(scheduler.reaction(source, 0, ['key'])).toEqual([
            { event: 'key', offsetMs: 0 },
        ]);
    });

    test('drops, rather than queues, what lands inside a kind’s floor', () => {
        const time = clock();
        const scheduler = new CueScheduler(time.now);
        const source = evaluator();
        // Pointer's floor is well above 10ms, so the second move is dropped —
        // a queued cue would describe a position the pointer already left.
        expect(scheduler.reaction(source, 0, ['pointer'])).toHaveLength(1);
        time.advance(10);
        expect(scheduler.reaction(source, 1, ['pointer'])).toHaveLength(0);
        time.advance(Cues.pointer.floorMs);
        expect(scheduler.reaction(source, 2, ['pointer'])).toHaveLength(1);
    });

    test('a floorless kind cues on every event', () => {
        const time = clock();
        const scheduler = new CueScheduler(time.now);
        const source = evaluator();
        expect(Cues.key.floorMs).toBe(0);
        for (let index = 0; index < 5; index++) {
            expect(scheduler.reaction(source, index, ['key'])).toHaveLength(1);
            time.advance(5);
        }
    });

    test('staggers several streams of one reaction rather than smearing them', () => {
        const time = clock();
        const scheduler = new CueScheduler(time.now);
        const scheduled = scheduler.reaction(evaluator(), 0, [
            'key',
            'button',
            'choice',
        ]);
        expect(scheduled.map((cue) => cue.event)).toEqual([
            'key',
            'button',
            'choice',
        ]);
        // Strictly increasing, so each is heard as its own event.
        expect(scheduled[0].offsetMs).toBeLessThan(scheduled[1].offsetMs);
        expect(scheduled[1].offsetMs).toBeLessThan(scheduled[2].offsetMs);
    });

    test('cues at most three streams of one reaction', () => {
        const time = clock();
        const scheduler = new CueScheduler(time.now);
        const events: CueEvent[] = ['key', 'button', 'choice', 'chat', 'scene'];
        expect(
            scheduler.reaction(evaluator(), 0, events).length,
        ).toBeLessThanOrEqual(MaxCuesPerReaction);
    });

    test('drops a cue the stagger would push too far behind its event', () => {
        const time = clock();
        const scheduler = new CueScheduler(time.now);
        const source = evaluator();
        // A long burst of floorless events in one instant: the stagger fills
        // up, and cues that would land more than MaxCueLagMs late are dropped
        // rather than heard after the fact.
        let sounded = 0;
        for (let index = 0; index < 40; index++)
            sounded += scheduler.reaction(source, index, ['key']).length;
        expect(sounded).toBeLessThanOrEqual(
            Math.floor(MaxCueLagMs / CueSpacingMs) + 1,
        );
    });

    test('cues a reaction once however many drivers ask', () => {
        const time = clock();
        const scheduler = new CueScheduler(time.now);
        const source = evaluator();
        expect(scheduler.reaction(source, 7, ['key'])).toHaveLength(1);
        expect(scheduler.reaction(source, 7, ['key'])).toHaveLength(0);
    });

    test('two evaluators keep their own histories', () => {
        const time = clock();
        const scheduler = new CueScheduler(time.now);
        expect(scheduler.reaction(evaluator(), 0, ['scene'])).toHaveLength(1);
        expect(scheduler.reaction(evaluator(), 0, ['scene'])).toHaveLength(1);
    });
});

describe('physics contacts', () => {
    /** A burst of contacts, weakest first, so the tests can check ordering. */
    function burst(...strengths: number[]) {
        return strengths.map((strength) => ({ strength }));
    }

    test('several contacts of one burst are heard, not one', () => {
        const time = clock();
        const scheduler = new CueScheduler(time.now);
        // The whole point: a landing is several things landing, and the
        // reaction path would have collapsed this to a single thump.
        expect(scheduler.contacts(burst(0.2, 0.5, 0.9))).toHaveLength(3);
    });

    test('they sound together rather than staggered', () => {
        const time = clock();
        const scheduler = new CueScheduler(time.now);
        // Staggering the clicks of one landing turns it into a stutter.
        for (const cue of scheduler.contacts(burst(0.3, 0.6, 0.9)))
            expect(cue.offsetMs).toBe(0);
    });

    test('the loudest are the ones kept', () => {
        const time = clock();
        const scheduler = new CueScheduler(time.now);
        const scheduled = scheduler.contacts(
            burst(0.1, 0.2, 0.3, 0.4, 0.5, 0.95),
        );
        expect(scheduled).toHaveLength(ContactPolyphony);
        expect(scheduled[0].strength).toBe(0.95);
        // Every kept contact is louder than every dropped one.
        expect(Math.min(...scheduled.map((cue) => cue.strength ?? 0))).toBe(
            0.3,
        );
    });

    test('a burst carries each contact’s strength', () => {
        const time = clock();
        const scheduler = new CueScheduler(time.now);
        expect(
            scheduler.contacts(burst(0.25)).map((cue) => cue.strength),
        ).toEqual([0.25]);
    });

    test('bursts are floored, so a bouncing stage is not a rattle', () => {
        const time = clock();
        const scheduler = new CueScheduler(time.now);
        expect(scheduler.contacts(burst(0.9))).toHaveLength(1);
        time.advance(Cues.collision.floorMs - 1);
        expect(scheduler.contacts(burst(0.9))).toHaveLength(0);
        time.advance(1);
        expect(scheduler.contacts(burst(0.9))).toHaveLength(1);
    });

    test('an empty burst is silent', () => {
        const time = clock();
        const scheduler = new CueScheduler(time.now);
        expect(scheduler.contacts([])).toHaveLength(0);
    });

    test('a burst holds the spacing window against the next cue', () => {
        const time = clock();
        const scheduler = new CueScheduler(time.now);
        scheduler.contacts(burst(0.9, 0.8));
        // A key pressed in the same instant is heard after the burst, not on
        // top of it — the stagger's job between different kinds is unchanged.
        const [cue] = scheduler.reaction({}, 0, ['key']);
        expect(cue.offsetMs).toBe(CueSpacingMs);
    });

    test('polyphony belongs only where simultaneous events are distinct things', () => {
        // Four contacts are four landings and eight pose cues are eight moments
        // of one animation; a stream that fired four times in an instant is
        // still one piece of news, so everything else collapses.
        const polyphonic = Object.entries(Cues)
            .filter(([, spec]) => (spec.polyphony ?? 1) > 1)
            .map(([event]) => event)
            .sort();
        expect(polyphonic).toEqual(['collision', 'pose']);
    });
});

describe('which switch governs a cue', () => {
    test('every cue is governed by exactly one of the three', () => {
        // Total over CueEvent, so a new cue kind can't quietly default into the
        // evaluation switch without someone deciding it belongs there.
        for (const event of Object.keys(Cues))
            expect(['evaluation', 'contact', 'animation']).toContain(
                gateOf(event as CueEvent),
            );
    });

    test('a contact is not a re-evaluation and an animation is neither', () => {
        // A contact sounds whether or not the program evaluates Collision(),
        // and both are far denser than a keypress, which is why each has a
        // switch rather than riding the evaluation one.
        expect(gateOf('collision')).toBe('contact');
        for (const event of ['pose', 'loop', 'entering', 'moving', 'exiting'])
            expect(gateOf(event as CueEvent), event).toBe('animation');
    });

    test('streams and the start of an evaluation are evaluation cues', () => {
        for (const event of ['key', 'pointer', 'time', 'start'])
            expect(gateOf(event as CueEvent), event).toBe('evaluation');
    });
});
