import { describe, expect, test } from 'vitest';

import ProjectCRDT from '@db/projects/ProjectCRDT';
import { shouldReplayRemotePlainCode } from '@db/projects/crdtFold';

/**
 * Guards the case-(b) decision in ProjectsDatabase.foldRemoteCRDT.
 *
 * Regression: live coediting dropped the first character on the receiving
 * peer (nightly WebKit e2e, collaborative-editing "two users" test). Both
 * peers converged their Y.Docs to the full text via the realtime channel,
 * then a project-doc snapshot was read whose authoritative `crdt` field was
 * complete but whose materialized plain `code` view trailed it by one
 * character. Case (b) replayed that lossy `code` into the converged Y.Doc as
 * a 'remote' edit and deleted the already-converged character. The fix: never
 * replay plain `code` when the remote carries a CRDT snapshot.
 */
describe('shouldReplayRemotePlainCode — case-(b) gate', () => {
    test('never replays when the remote carries a CRDT snapshot (the bug fix)', () => {
        // A CRDT-aware peer's snapshot is authoritative; its plain `code`
        // view can lag under concurrent typing, so it must never win.
        expect(
            shouldReplayRemotePlainCode({
                remoteHasCRDT: true,
                snapshotChangedSource: false,
                fresh: true,
            }),
        ).toBe(false);
        // True regardless of the other inputs.
        expect(
            shouldReplayRemotePlainCode({
                remoteHasCRDT: true,
                snapshotChangedSource: true,
                fresh: false,
            }),
        ).toBe(false);
    });

    test('does not replay when the folded snapshot already moved the source (case a)', () => {
        expect(
            shouldReplayRemotePlainCode({
                remoteHasCRDT: false,
                snapshotChangedSource: true,
                fresh: true,
            }),
        ).toBe(false);
    });

    test('does not replay a stale non-CRDT write (would roll back local typing)', () => {
        expect(
            shouldReplayRemotePlainCode({
                remoteHasCRDT: false,
                snapshotChangedSource: false,
                fresh: false,
            }),
        ).toBe(false);
    });

    test('replays a fresh genuinely-non-CRDT write (legitimate case b)', () => {
        // Cloud Function rename / admin-SDK rewrite / pre-v8 client: no crdt
        // snapshot, fresh timestamp, snapshot did not move the source.
        expect(
            shouldReplayRemotePlainCode({
                remoteHasCRDT: false,
                snapshotChangedSource: false,
                fresh: true,
            }),
        ).toBe(true);
    });
});

describe('foldRemoteCRDT semantics — a converged character survives a lagging plain code', () => {
    test('a present CRDT snapshot is authoritative; a short plain code does not delete', () => {
        // Reproduce the fold's inputs: a peer (A) typed "aa" before the seed,
        // both Y.Docs converged to the full text, and the remote doc we read
        // carries that full state as its crdt snapshot.
        const seed = 'Phrase("hi")';
        const converged = `aa213cb0${seed}`;
        const laggingPlainCode = `a213cb0${seed}`; // first 'a' missing

        // Local Y.Doc, already converged via the realtime channel.
        const local = ProjectCRDT.fromSources([seed]);
        local.applyLocalEdit(0, seed, converged, 'local');

        // Remote project doc: its crdt snapshot encodes the same converged
        // state (so folding it moves nothing), and remoteHasCRDT is true.
        const remoteHasCRDT = true;
        const beforeApply = local.getCode(0);
        // Folding the remote snapshot is a no-op here (already converged).
        const snapshotChangedSource = local.getCode(0) !== beforeApply;

        const replay = shouldReplayRemotePlainCode({
            remoteHasCRDT,
            snapshotChangedSource,
            fresh: true,
        });
        expect(replay).toBe(false);

        // The fix means we never apply the lossy plain code, so the
        // converged character survives.
        if (replay)
            local.applyLocalEdit(0, local.getCode(0), laggingPlainCode, 'remote');
        expect(local.getCode(0)).toBe(converged);

        // Sanity: had we replayed (the pre-fix behavior), the character would
        // have been deleted.
        const broken = ProjectCRDT.fromSources([seed]);
        broken.applyLocalEdit(0, seed, converged, 'local');
        broken.applyLocalEdit(0, broken.getCode(0), laggingPlainCode, 'remote');
        expect(broken.getCode(0)).toBe(laggingPlainCode);
    });
});
