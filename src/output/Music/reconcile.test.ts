import { reconcile, type LiveMusic } from '@output/Music/reconcile';
import type { MusicData, TrackData } from '@output/Music/musicData';
import { describe, expect, test } from 'vitest';

function track(): TrackData {
    return {
        notes: [{ degrees: [1], beats: 1, volume: 1 }],
        instrument: 'piano',
        scale: [0, 2, 4, 5, 7, 9, 11],
        key: 0,
        volume: 1,
        pan: 0,
        loop: false,
        mash: true,
    };
}

function music(options: Partial<MusicData> = {}): MusicData {
    return {
        name: 'song',
        tempo: 60,
        volume: 1,
        key: 0,
        scale: [0, 2, 4, 5, 7, 9, 11],
        replay: false,
        pause: false,
        description: undefined,
        tracks: [track()],
        ...options,
    };
}

function playing(data: MusicData, finished: boolean): Map<string, LiveMusic> {
    return new Map([[data.name, { data, draining: false, finished }]]);
}

describe('beginning a new performance', () => {
    test('a piece that already played to its end sounds again', () => {
        // The creator asked to watch the program from the top; a one-shot score
        // that stays silent is not that. Same request as pressing replay.
        const data = music();
        expect(
            reconcile(playing(data, true), [data], true).get('song'),
        ).toEqual({ kind: 'restart', data });
    });

    test('a piece still playing starts over rather than continuing', () => {
        const data = music();
        expect(
            reconcile(playing(data, false), [data], true).get('song'),
        ).toEqual({ kind: 'restart', data });
    });
});

describe('within one performance', () => {
    test('a finished piece stays quiet', () => {
        // Resuming a paused stage must not re-fire a one-shot, which is what
        // glancing at the editor would otherwise do every time.
        const data = music();
        expect(
            reconcile(playing(data, true), [data], false).get('song'),
        ).toEqual({ kind: 'keep' });
    });

    test('an unchanged piece still playing is kept', () => {
        const data = music();
        expect(
            reconcile(playing(data, false), [data], false).get('song'),
        ).toEqual({ kind: 'keep' });
    });

    test('an edited piece still splices rather than restarting', () => {
        // The performance flag must not swallow the splice decision: editing a
        // score while it plays should fold the change in at the next beat.
        const before = music();
        const after = music({ tempo: 120 });
        expect(
            reconcile(playing(before, false), [after], false).get('song'),
        ).toEqual({ kind: 'splice', data: after });
    });

    test('a music new to the stage starts, performance or not', () => {
        const data = music();
        for (const beginning of [true, false])
            expect(reconcile(new Map(), [data], beginning).get('song')).toEqual(
                { kind: 'start', data },
            );
    });
});
