import type Gallery from '@db/galleries/Gallery';
import type { GalleryResult } from '@db/galleries/GalleryDatabase.svelte';
import { expect, test, vi } from 'vitest';
import resolveGallery from './resolveGallery';

/** Only identity matters here, so a stand-in beats building a real Gallery. */
const gallery = { id: 'g1' } as unknown as Gallery;

function lookup(result: GalleryResult) {
    return vi.fn(() => Promise.resolve(result));
}

test('nothing local and nothing settled yet is still loading, and asks no one', async () => {
    const find = lookup({ kind: 'missing' });
    expect(await resolveGallery('g1', false, false, find)).toBe(null);
    // Answering "doesn't exist" before the user is known was the old bug; not
    // reading at all before then is what keeps the page on its spinner.
    expect(find).not.toHaveBeenCalled();
});

test('a gallery the maps already hold resolves without waiting to settle', async () => {
    const find = lookup({ kind: 'found', gallery });
    expect(await resolveGallery('g1', true, false, find)).toBe(gallery);
});

// The point of the change: settled with nothing local is a question for the
// database, not a conclusion. The listener may be slow, or gone.
test('settled with nothing local asks the database rather than concluding', async () => {
    const find = lookup({ kind: 'found', gallery });
    expect(await resolveGallery('g1', false, true, find)).toBe(gallery);
    expect(find).toHaveBeenCalledWith('g1');
});

test('a gallery that really is missing reports missing', async () => {
    expect(
        await resolveGallery('g1', false, true, lookup({ kind: 'missing' })),
    ).toBeUndefined();
});

// "We couldn't go look" is not "it isn't there": a timed-out read must not tell
// a curator their own space is gone. The caller re-runs this when the maps
// change, so a recovered connection resolves it.
test('an unreachable lookup keeps loading rather than claiming it is gone', async () => {
    expect(
        await resolveGallery(
            'g1',
            false,
            true,
            lookup({ kind: 'unreachable' }),
        ),
    ).toBe(null);
});
