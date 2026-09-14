import { describe, expect, test } from 'vitest';
import { claimAction, InFlightGraceMs } from './classCreation.js';

/**
 * The retry record is the only thing standing between a dropped response and a
 * teacher who can never create their class: every username their first attempt
 * took is now taken, and nothing tells them whether the class exists.
 */

const Now = 1_757_000_000_000;

describe('claiming an attempt', () => {
    test('the first call owns it', () => {
        expect(claimAction(undefined, 't1', Now)).toEqual({ kind: 'claimed' });
    });

    test('a retry after a dropped response is answered, not re-run', () => {
        expect(
            claimAction(
                {
                    v: 1,
                    teacher: 't1',
                    started: Now,
                    classid: 'c1',
                    students: [{ username: 'alice', existed: false }],
                },
                't1',
                Now + 1000,
            ),
        ).toEqual({
            kind: 'done',
            classid: 'c1',
            students: [{ username: 'alice', existed: false }],
        });
    });

    test('a finished attempt from before this shipped still answers', () => {
        // `students` was not always recorded; an empty list beats a failure.
        expect(
            claimAction(
                { v: 1, teacher: 't1', started: Now, classid: 'c1' },
                't1',
                Now + 1000,
            ),
        ).toEqual({ kind: 'done', classid: 'c1', students: [] });
    });

    test('a second call while the first is still running waits', () => {
        expect(
            claimAction(
                { v: 1, teacher: 't1', started: Now },
                't1',
                Now + InFlightGraceMs - 1,
            ),
        ).toEqual({ kind: 'inflight' });
    });

    test('an attempt whose process died is handed to the retry', () => {
        // Telling the teacher to wait for a run that will never finish is worse
        // than letting them try: if it died before creating anything the retry
        // simply works, and if it died after, the usernames are reported by name.
        expect(
            claimAction(
                { v: 1, teacher: 't1', started: Now },
                't1',
                Now + InFlightGraceMs + 1,
            ),
        ).toEqual({ kind: 'claimed' });
    });

    test('a guessed key never reads back another teacher’s class', () => {
        expect(
            claimAction(
                { v: 1, teacher: 't1', started: Now, classid: 'c1' },
                't2',
                Now + 1000,
            ),
        ).toEqual({ kind: 'inflight' });
    });
});
