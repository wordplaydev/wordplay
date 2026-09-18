import { expect, test, vi } from 'vitest';
import Gallery from './Gallery';
import type { GalleryResult } from './GalleryDatabase.svelte';
import resolveGalleryPath, {
    type GalleryPathLookups,
} from './resolveGalleryPath';

const ID = 'e0b1c2d3-4f89-11d3-9a0c-0305e82c3301';

function gallery(
    opts: {
        path?: string | null;
        pathAliases?: string[];
        public?: boolean;
    } = {},
) {
    return Gallery.make(
        ID,
        { 'en-US': 'Ms Kim' },
        { 'en-US': '' },
        ['curator'],
        [],
        { public: true, ...opts },
    );
}

const missing: GalleryResult = { kind: 'missing' };
const unreachable: GalleryResult = { kind: 'unreachable' };
const found = (g: Gallery): GalleryResult => ({ kind: 'found', gallery: g });

/** Every lookup answers "nothing here" unless the test says otherwise. */
function lookups(over: Partial<GalleryPathLookups> = {}): GalleryPathLookups {
    return {
        known: () => undefined,
        byID: async () => missing,
        byPath: async () => missing,
        byAlias: async () => missing,
        ...over,
    };
}

test('an id resolves from the local maps without touching the network', async () => {
    const g = gallery();
    const byID = vi.fn(async () => missing);
    const result = await resolveGalleryPath(
        ID,
        lookups({ known: () => g, byID }),
    );
    expect(result).toEqual({ kind: 'found', gallery: g });
    expect(byID).not.toHaveBeenCalled();
});

test("a curator's own private gallery resolves locally by path", async () => {
    // The queries below cannot answer this one: both carry `public == true`,
    // because a query's own constraints must imply the read rule. The local
    // maps are the only step that can, and the only step that needs to.
    const g = gallery({ path: 'kim-p4', public: false });
    const result = await resolveGalleryPath(
        'kim-p4',
        lookups({ known: () => g }),
    );
    expect(result).toEqual({ kind: 'found', gallery: g });
});

test('a public gallery resolves by path over the network', async () => {
    const g = gallery({ path: 'kim-p4' });
    const result = await resolveGalleryPath(
        'kim-p4',
        lookups({ byPath: async () => found(g) }),
    );
    expect(result).toEqual({ kind: 'found', gallery: g });
});

test('an old name resolves and redirects to the current one', async () => {
    const g = gallery({ path: 'kim-p4', pathAliases: ['kim-period-4'] });
    const result = await resolveGalleryPath(
        'kim-period-4',
        lookups({ byAlias: async () => found(g) }),
    );
    expect(result).toEqual({
        kind: 'redirect',
        gallery: g,
        to: '/gallery/kim-p4',
    });
});

test('an old name held locally also redirects', async () => {
    const g = gallery({ path: 'kim-p4', pathAliases: ['kim-period-4'] });
    const result = await resolveGalleryPath(
        'kim-period-4',
        lookups({ known: () => g }),
    );
    expect(result).toEqual({
        kind: 'redirect',
        gallery: g,
        to: '/gallery/kim-p4',
    });
});

test('the segment is folded before it is looked up', async () => {
    const g = gallery({ path: 'kim-p4' });
    const byPath = vi.fn(async () => found(g));
    await resolveGalleryPath('KIM-P4', lookups({ byPath }));
    expect(byPath).toHaveBeenCalledWith('kim-p4');
});

test('an id that resolves costs no path query', async () => {
    // Every link that worked before this feature must cost exactly what it did
    // before, which is what putting the id read first buys.
    const g = gallery();
    const byPath = vi.fn(async () => missing);
    const byAlias = vi.fn(async () => missing);
    const result = await resolveGalleryPath(
        ID,
        lookups({ byID: async () => found(g), byPath, byAlias }),
    );
    expect(result).toEqual({ kind: 'found', gallery: g });
    expect(byPath).not.toHaveBeenCalled();
    expect(byAlias).not.toHaveBeenCalled();
});

test('a current path wins over a gallery that once held the same name', async () => {
    // Asking the alias index only after nothing current answers is what stops a
    // gallery being shadowed by its own history, or by another's.
    const current = gallery({ path: 'kim-p4' });
    const byAlias = vi.fn(async () => missing);
    const result = await resolveGalleryPath(
        'kim-p4',
        lookups({ byPath: async () => found(current), byAlias }),
    );
    expect(result).toEqual({ kind: 'found', gallery: current });
    expect(byAlias).not.toHaveBeenCalled();
});

test('nothing anywhere is missing', async () => {
    expect(await resolveGalleryPath('nobody', lookups())).toEqual({
        kind: 'missing',
    });
});

test.each([
    ['byID', { byID: async () => unreachable }],
    ['byPath', { byPath: async () => unreachable }],
    ['byAlias', { byAlias: async () => unreachable }],
])('an unreachable %s makes the whole answer unreachable', async (_, over) => {
    // "We couldn't go look" is not "it isn't there". Reporting missing here
    // would tell a visitor their gallery does not exist because we lost the
    // connection one step earlier.
    expect(await resolveGalleryPath('kim-p4', lookups(over))).toEqual({
        kind: 'unreachable',
    });
});

test('an unreachable step still yields to a later hit', async () => {
    const g = gallery({ path: 'kim-p4' });
    const result = await resolveGalleryPath(
        'kim-p4',
        lookups({
            byID: async () => unreachable,
            byPath: async () => found(g),
        }),
    );
    expect(result).toEqual({ kind: 'found', gallery: g });
});

test('an id redirects to the name once the gallery has one', async () => {
    // The point of a vanity path is a link worth copying out of the address
    // bar, so an id that resolves to a named gallery hands over the name (#180).
    const g = gallery({ path: 'kim-p4' });
    const result = await resolveGalleryPath(
        ID,
        lookups({ byID: async () => found(g) }),
    );
    expect(result).toEqual({
        kind: 'redirect',
        gallery: g,
        to: '/gallery/kim-p4',
    });
});

test('an id held locally redirects to the name too', async () => {
    // A curator's own gallery comes from the local maps rather than the id
    // read, and the two must not disagree about which address is canonical.
    const g = gallery({ path: 'kim-p4' });
    const byID = vi.fn(async () => missing);
    const result = await resolveGalleryPath(
        ID,
        lookups({ known: () => g, byID }),
    );
    expect(result).toEqual({
        kind: 'redirect',
        gallery: g,
        to: '/gallery/kim-p4',
    });
    expect(byID).not.toHaveBeenCalled();
});

test('an id with no name to offer answers as itself', async () => {
    // Every gallery link that predates this feature still resolves in place,
    // with no redirect and no extra query.
    const g = gallery({ path: null });
    const result = await resolveGalleryPath(
        ID,
        lookups({ byID: async () => found(g) }),
    );
    expect(result).toEqual({ kind: 'found', gallery: g });
});

test('a private gallery does not redirect its id to a name nobody can use', async () => {
    // `getLink` gates the path on isPublic, so a gallery that has gone private
    // is canonically its id again — redirecting to the path would move a
    // curator onto an address that resolves for no one else.
    const g = gallery({ path: 'kim-p4', public: false });
    const result = await resolveGalleryPath(ID, lookups({ known: () => g }));
    expect(result).toEqual({ kind: 'found', gallery: g });
});
