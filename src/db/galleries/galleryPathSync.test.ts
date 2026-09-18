import { readFileSync } from 'fs';
import path from 'path';
import { expect, test } from 'vitest';
import * as server from '../../../functions/src/galleryPath';
import { ExampleGalleries } from '../../../functions/src/preview/shared';
import * as client from './galleryPath';

/**
 * `functions/` compiles with rootDir "src" and cannot import from src/, so the
 * gallery path rules exist twice. The server copy is the authority — it is what
 * the claim transaction decides with — and the client copy is what the gallery's
 * path field validates with as you type.
 *
 * A drift between them is silent in the worst direction: the field would accept
 * a path the callable then refuses, so a curator is told their name is taken
 * when it is merely unspellable. Compare behavior rather than source text, so a
 * rule reworded on one side only still passes and a rule *changed* on one side
 * only fails.
 */

const Corpus = [
    'kim-p4',
    'games',
    'Games',
    'howto',
    'wordplay',
    // Separator misuse, each shape on its own.
    '-lead',
    'trail-',
    'dou--ble',
    '-',
    // Compatibility spoofs that fold onto a reserved name.
    'Ｇａｍｅｓ',
    '𝐠𝐚𝐦𝐞𝐬',
    // The scripts the single-run rule would have cost us.
    '日本語-ゲーム',
    'español-1',
    'مرحبا-2',
    'мария-3',
    'மனிதன்',
    // A name a Wordplay username may not hold, but a URL may.
    'ƒunction',
    'øbject',
    // Length edges.
    'ab',
    'abc',
    'a'.repeat(40),
    'a'.repeat(41),
    // Shaped like a Firestore id.
    '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
    // Marks are what tell these two apart, so the fold must keep them apart.
    'José',
    'Jose',
    // Characters the charset refuses.
    'ms kim',
    "kim's-class",
    'a_bcde',
    'a.bcde',
    'a/bcde',
    '',
];

test('both copies accept and refuse exactly the same paths', () => {
    for (const name of Corpus)
        expect(server.isValidGalleryPath(name), name).toBe(
            client.isValidGalleryPath(name),
        );
});

test('both copies repair a name the same way', () => {
    // The field suggests a repair as you type. If the two disagreed, it would
    // offer a name the server's own repair would not produce.
    for (const name of Corpus)
        expect(server.repairGalleryPath(name), name).toBe(
            client.repairGalleryPath(name),
        );
});

test('both copies fold to the same key', () => {
    // The fold decides uniqueness. If the two disagreed, a path could be
    // reserved under one key and looked up under another, and two galleries
    // would end up answering to the same URL.
    for (const name of Corpus)
        expect(server.foldGalleryPath(name), name).toBe(
            client.foldGalleryPath(name),
        );
});

test('the shared constants match', () => {
    expect(server.GalleryPathMinLength).toBe(client.GalleryPathMinLength);
    expect(server.GalleryPathMaxLength).toBe(client.GalleryPathMaxLength);
    expect(server.MaxGalleryPathAliases).toBe(client.MaxGalleryPathAliases);
    expect(server.GalleryPathCollection).toBe(client.GalleryPathCollection);
    expect([...server.ReservedGalleryPaths]).toEqual([
        ...client.ReservedGalleryPaths,
    ]);
});

test('every built-in example gallery id is reserved', () => {
    // Resolution tries the id before the path, so a cloud gallery that claimed
    // `Games` would hold a name that silently never resolves to it. Held
    // against the functions-side manifest, which exampleManifestSync.test.ts
    // already pins to examples.ts — so adding an example gallery without
    // reserving its id fails here.
    for (const id of Object.keys(ExampleGalleries))
        expect(
            server.ReservedGalleryPaths.includes(server.foldGalleryPath(id)),
            `${id} is reserved`,
        ).toBe(true);
});

test('every reserved entry is itself a well-formed key', () => {
    // A reserved entry that could never have been typed anyway is dead weight
    // and a sign the list has rotted. Fold-stability and charset only, NOT
    // length: `av` is shorter than the minimum, which makes it doubly
    // unclaimable rather than contradictory.
    for (const entry of server.ReservedGalleryPaths) {
        expect(server.foldGalleryPath(entry), entry).toBe(entry);
        expect(entry, entry).toMatch(/^[\p{L}\p{M}\p{N}-]+$/u);
        expect(entry, entry).not.toMatch(/^-|-$|--/u);
    }
});

test('the server copy imports nothing', () => {
    // It has to stay standalone: anything it imported from src/ would compile
    // here and fail to deploy, and the failure would appear as a broken
    // function rather than a broken build.
    const source = readFileSync(
        path.join(process.cwd(), 'functions/src/galleryPath.ts'),
        'utf-8',
    );
    expect(source).not.toMatch(/^\s*import\s/m);
});
