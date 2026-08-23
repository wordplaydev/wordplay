import type { SerializedSourceCheckpoint } from '@db/projects/ProjectSchemas';
import { describe, expect, test } from 'vitest';
import {
    getCheckpoint,
    getCheckpointIndex,
    stepCheckpoint,
    type CheckpointAnchor,
} from './checkpoints';

/** A checkpoint whose single source's code identifies it, so tests can assert
 *  which entry an anchor resolved to, not just that it resolved. */
function checkpoint(time: number, code: string): SerializedSourceCheckpoint {
    return { time, sources: [{ names: 'main', code, caret: 0 }] };
}

const older = checkpoint(100, 'older');
const newer = checkpoint(200, 'newer');
const history = [older, newer];

describe('resolving an anchor', () => {
    test('null is now', () => {
        expect(getCheckpoint(history, null)).toBeUndefined();
        expect(getCheckpointIndex(history, null)).toBe(-1);
    });

    test('an anchor resolves to its own checkpoint', () => {
        expect(getCheckpoint(history, 100)).toBe(older);
        // Newest first, so the newer checkpoint is at 0.
        expect(getCheckpointIndex(history, 200)).toBe(0);
        expect(getCheckpointIndex(history, 100)).toBe(1);
    });

    test('emptied history resolves to now rather than throwing', () => {
        expect(getCheckpoint([], 100)).toBeUndefined();
        expect(getCheckpointIndex([], 100)).toBe(-1);
    });

    test('an appended checkpoint leaves the anchor on the same entry', () => {
        // What withCheckpoint() does every ~60s of editing: the index shifts,
        // the content the creator is reading must not.
        const appended = [...history, checkpoint(300, 'newest')];
        expect(getCheckpointIndex(history, 100)).toBe(1);
        expect(getCheckpointIndex(appended, 100)).toBe(2);
        expect(getCheckpoint(appended, 100)).toBe(older);
    });

    test('a size-cap shift that drops the anchor resolves to now', () => {
        // Project.withCheckpoint() shifts off the front when over the limit.
        expect(getCheckpoint(history.slice(1), 100)).toBeUndefined();
    });

    test('duplicate times resolve deterministically to the first match', () => {
        const collided = [checkpoint(100, 'a'), checkpoint(100, 'b')];
        // Newest first reverses, so the first match is the later element.
        expect(getCheckpoint(collided, 100)?.sources[0].code).toBe('b');
    });
});

describe('stepping', () => {
    test('back from now lands on the newest', () => {
        expect(stepCheckpoint(history, null, 1)).toBe(200);
    });

    test('back clamps at the oldest', () => {
        expect(stepCheckpoint(history, 100, 1)).toBe(100);
    });

    test('forward past the newest returns to now', () => {
        expect(stepCheckpoint(history, 200, -1)).toBeNull();
    });

    test('stepping with no history stays at now', () => {
        const anchor: CheckpointAnchor = null;
        expect(stepCheckpoint([], anchor, 1)).toBeNull();
    });

    test('a vanished anchor steps from now', () => {
        expect(stepCheckpoint(history, 999, 1)).toBe(200);
    });
});
