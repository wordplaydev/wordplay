import { expect, test } from 'vitest';
import { missedReplays, type Snapshot } from './missedReplays';
import type { MusicData } from './musicData';

function music(name: string, replay: boolean): MusicData {
    return {
        name,
        tempo: 120,
        key: 0,
        scale: [0, 2, 4, 5, 7, 9, 11],
        volume: 1,
        replay,
        pause: false,
        description: undefined,
        tracks: [],
    };
}

function snapshot(stepNumber: number, ...musics: MusicData[]): Snapshot {
    return { stepNumber, musics };
}

test('nothing missed, nothing to deliver', () => {
    expect(missedReplays([])).toEqual([]);
});

test('evaluations that carried no replay are content, already current', () => {
    expect(
        missedReplays([
            snapshot(1, music('a', false)),
            snapshot(2, music('a', false)),
        ]),
    ).toEqual([]);
});

test('only the evaluation that carried the replay is delivered', () => {
    const carrying = music('a', true);
    expect(
        missedReplays([
            snapshot(1, music('a', false)),
            snapshot(2, carrying),
            snapshot(3, music('a', false)),
        ]),
    ).toEqual([snapshot(2, carrying)]);
});

test('a replay on any one of several musics counts for that evaluation', () => {
    const quiet = music('song', false);
    const ding = music('ding', true);
    expect(missedReplays([snapshot(1, quiet, ding)])).toEqual([
        snapshot(1, quiet, ding),
    ]);
});

// Restarts of one name cancel each other before any of them schedules a note,
// so the ones dropped here could not have been heard.
test('past the limit, the newest survive, still oldest first', () => {
    const carrying = [1, 2, 3, 4, 5].map((n) => music(`m${n}`, true));
    expect(
        missedReplays(
            carrying.map((m, index) => snapshot(index, m)),
            2,
        ),
    ).toEqual([snapshot(3, carrying[3]), snapshot(4, carrying[4])]);
});

test('the limit counts replays, not evaluations', () => {
    const first = music('a', true);
    const second = music('b', true);
    expect(
        missedReplays(
            [
                snapshot(1, first),
                snapshot(2, music('a', false)),
                snapshot(3, music('a', false)),
                snapshot(4, second),
            ],
            2,
        ),
    ).toEqual([snapshot(1, first), snapshot(4, second)]);
});
