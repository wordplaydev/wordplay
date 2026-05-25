import { describe, expect, test } from 'vitest';
import ProjectCRDT from './ProjectCRDT';

describe('ProjectCRDT', () => {
    test('initializes empty', () => {
        const crdt = new ProjectCRDT();
        expect(crdt.getCode(0)).toBe('');
    });

    test('fromSources seeds Y.Text per source', () => {
        const crdt = ProjectCRDT.fromSources(['a', 'b', 'c']);
        expect(crdt.getCode(0)).toBe('a');
        expect(crdt.getCode(1)).toBe('b');
        expect(crdt.getCode(2)).toBe('c');
    });

    test('applyLocalEdit produces minimal diff for single insertion', () => {
        const crdt = ProjectCRDT.fromSources(['hello world']);
        crdt.applyLocalEdit(0, 'hello world', 'hello beautiful world');
        expect(crdt.getCode(0)).toBe('hello beautiful world');
    });

    test('applyLocalEdit handles single-character delete', () => {
        const crdt = ProjectCRDT.fromSources(['abc']);
        crdt.applyLocalEdit(0, 'abc', 'ac');
        expect(crdt.getCode(0)).toBe('ac');
    });

    test('applyLocalEdit is idempotent for unchanged code', () => {
        const crdt = ProjectCRDT.fromSources(['abc']);
        crdt.applyLocalEdit(0, 'abc', 'abc');
        expect(crdt.getCode(0)).toBe('abc');
    });

    test('encode / fromSnapshot round-trips', () => {
        const a = ProjectCRDT.fromSources(['foo', 'bar']);
        a.applyLocalEdit(0, 'foo', 'foobar');
        const snapshot = a.encode();
        const b = ProjectCRDT.fromSnapshot(snapshot);
        expect(b.getCode(0)).toBe('foobar');
        expect(b.getCode(1)).toBe('bar');
    });

    test('null snapshot yields empty CRDT', () => {
        const c = ProjectCRDT.fromSnapshot(null);
        expect(c.getCode(0)).toBe('');
    });

    test('concurrent inserts at the same position converge across replicas', () => {
        const a = ProjectCRDT.fromSources(['hello']);
        const b = ProjectCRDT.fromSnapshot(a.encode());

        // Concurrent edits — A inserts at index 5, B inserts at index 5.
        a.applyLocalEdit(0, 'hello', 'hello A!');
        b.applyLocalEdit(0, 'hello', 'hello B!');

        // Exchange diffs (Stage 3 will do this over Firestore).
        const aDiffForB = a.encodeDiff(b.encodeStateVector());
        const bDiffForA = b.encodeDiff(a.encodeStateVector());
        b.applyRemoteUpdate(aDiffForB);
        a.applyRemoteUpdate(bDiffForA);

        // Both replicas converge to the same string (and content from both edits).
        expect(a.getCode(0)).toBe(b.getCode(0));
        expect(a.getCode(0)).toContain('A!');
        expect(a.getCode(0)).toContain('B!');
    });

    test('listeners fire on local edits', () => {
        const crdt = ProjectCRDT.fromSources(['x']);
        const seen: string[] = [];
        crdt.onChange((idx, code) => {
            if (idx === 0) seen.push(code);
        });
        crdt.applyLocalEdit(0, 'x', 'xy');
        expect(seen).toContain('xy');
    });

    test('large prefix common to old/new stays as a stable insert tail', () => {
        const big = 'a'.repeat(500);
        const crdt = ProjectCRDT.fromSources([big]);
        crdt.applyLocalEdit(0, big, big + 'z');
        expect(crdt.getCode(0)).toBe(big + 'z');
    });
});
