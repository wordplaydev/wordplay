import { describe, expect, test } from 'vitest';
import {
    bumpField,
    compareStamps,
    emptyStamps,
    getStamp,
    mergeField,
    mergeStamps,
    NeverWritten,
    nextStamp,
} from './VectorClock';

describe('FieldStamp comparison', () => {
    test('higher counter wins', () => {
        expect(compareStamps({ c: 2, w: 'a' }, { c: 1, w: 'b' })).toBe(1);
        expect(compareStamps({ c: 1, w: 'a' }, { c: 2, w: 'b' })).toBe(-1);
    });
    test('tiebreak by writer lex order', () => {
        expect(compareStamps({ c: 1, w: 'b' }, { c: 1, w: 'a' })).toBe(1);
        expect(compareStamps({ c: 1, w: 'a' }, { c: 1, w: 'b' })).toBe(-1);
    });
    test('identical stamps are equal', () => {
        expect(compareStamps({ c: 1, w: 'a' }, { c: 1, w: 'a' })).toBe(0);
    });
    test('NeverWritten loses to anything written', () => {
        expect(compareStamps({ c: 1, w: 'a' }, NeverWritten)).toBe(1);
    });
});

describe('nextStamp', () => {
    test('advances Lamport by one', () => {
        expect(nextStamp(0, 'A')).toEqual({ c: 1, w: 'A' });
        expect(nextStamp(5, 'B')).toEqual({ c: 6, w: 'B' });
    });
});

describe('bumpField + getStamp', () => {
    test('bumping a fresh field stamps it with writer + new counter', () => {
        const after = bumpField(emptyStamps(), 'name', 'A');
        expect(getStamp(after, 'name')).toEqual({ c: 1, w: 'A' });
        expect(after.lamport).toBe(1);
    });
    test('bumping advances the Lamport ceiling across fields', () => {
        let stamps = emptyStamps();
        stamps = bumpField(stamps, 'name', 'A'); // lamport 1
        stamps = bumpField(stamps, 'public', 'A'); // lamport 2
        stamps = bumpField(stamps, 'name', 'A'); // lamport 3, overwrites
        expect(getStamp(stamps, 'name')).toEqual({ c: 3, w: 'A' });
        expect(getStamp(stamps, 'public')).toEqual({ c: 2, w: 'A' });
        expect(stamps.lamport).toBe(3);
    });
    test('missing field returns NeverWritten', () => {
        expect(getStamp(emptyStamps(), 'missing')).toEqual(NeverWritten);
    });
});

describe('mergeStamps + mergeField — the #135 scenario', () => {
    test('concurrent edits to different fields both survive', () => {
        // Device A edits the project name offline.
        let A = emptyStamps();
        A = bumpField(A, 'name', 'A');

        // Device B edits the code online.
        let B = emptyStamps();
        B = bumpField(B, 'code', 'B');

        // Merge: name wins from A, code wins from B.
        const merged = mergeStamps(A, B);
        expect(getStamp(merged, 'name')).toEqual({ c: 1, w: 'A' });
        expect(getStamp(merged, 'code')).toEqual({ c: 1, w: 'B' });

        // The picked value for each field should match the winning stamp.
        const nameValue = mergeField(
            'A-name',
            getStamp(A, 'name'),
            'B-name',
            getStamp(B, 'name'),
        );
        const codeValue = mergeField(
            'A-code',
            getStamp(A, 'code'),
            'B-code',
            getStamp(B, 'code'),
        );
        expect(nameValue).toBe('A-name');
        expect(codeValue).toBe('B-code');
    });

    test('concurrent edits to the same field converge deterministically', () => {
        // Both A and B edit `name` concurrently from the same base state.
        const base = emptyStamps();
        const A = bumpField(base, 'name', 'A');
        const B = bumpField(base, 'name', 'B');

        // Both replicas merge — the one with the higher writer ID wins ties.
        const mergedAB = mergeStamps(A, B);
        const mergedBA = mergeStamps(B, A);
        expect(getStamp(mergedAB, 'name')).toEqual({ c: 1, w: 'B' });
        expect(getStamp(mergedBA, 'name')).toEqual({ c: 1, w: 'B' });

        // mergeField agrees.
        expect(
            mergeField(
                'A-name',
                getStamp(A, 'name'),
                'B-name',
                getStamp(B, 'name'),
            ),
        ).toBe('B-name');
    });

    test('later sequential edit beats an earlier one', () => {
        // A edits, then learns of B, then edits again — A's later edit wins.
        let A = emptyStamps();
        A = bumpField(A, 'name', 'A'); // {c:1, w:A}

        let B = emptyStamps();
        B = bumpField(B, 'name', 'B'); // {c:1, w:B}

        // A sees B's update, merges, then edits name again.
        A = mergeStamps(A, B); // lamport now 1
        A = bumpField(A, 'name', 'A'); // {c:2, w:A} — beats B's {c:1, w:B}

        expect(getStamp(A, 'name')).toEqual({ c: 2, w: 'A' });
        const finalMerge = mergeStamps(A, B);
        expect(getStamp(finalMerge, 'name')).toEqual({ c: 2, w: 'A' });
    });

    test('merge is commutative and associative for stamps', () => {
        let A = bumpField(emptyStamps(), 'name', 'A');
        let B = bumpField(emptyStamps(), 'code', 'B');
        let C = bumpField(emptyStamps(), 'public', 'C');
        const ab = mergeStamps(A, B);
        const ba = mergeStamps(B, A);
        expect(ab).toEqual(ba);
        const abc = mergeStamps(mergeStamps(A, B), C);
        const cba = mergeStamps(C, mergeStamps(B, A));
        expect(abc).toEqual(cba);
    });
});
