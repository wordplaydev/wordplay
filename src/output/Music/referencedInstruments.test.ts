import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import referencedInstruments from '@output/Music/referencedInstruments';
import { describe, expect, test } from 'vitest';

function instrumentsOf(code: string) {
    const source = new Source('test', code);
    return referencedInstruments(
        Project.make(null, 'test', source, [], DefaultLocale),
    ).sort();
}

describe('referencedInstruments', () => {
    test('finds instruments named directly', () => {
        expect(
            instrumentsOf('Music(Track([1] instrument: Instrument.violin))'),
        ).toContain('violin');
    });

    test('includes piano even when nothing names it', () => {
        // Track's instrument input defaults to piano, so a project can play it
        // with no reference at all. Missing this would leave the commonest
        // instrument the one thing that still loads late.
        expect(instrumentsOf('Music(Track([1 2 3]))')).toEqual(['piano']);
    });

    test('finds every branch of a function that chooses an instrument', () => {
        // Conductor's shape: which branch runs is a runtime question, but each
        // names its instrument literally, so all of them are preloadable.
        const found = instrumentsOf(`
ƒ voice(count•#)•Instrument
	(count = 1) ? Instrument.flute
	Instrument.trumpet
Music(Track([1] instrument: voice(1)))`);
        expect(found).toContain('flute');
        expect(found).toContain('trumpet');
    });

    test('finds nothing in a project with no music', () => {
        expect(instrumentsOf("Phrase('hi')")).toEqual([]);
    });
});
