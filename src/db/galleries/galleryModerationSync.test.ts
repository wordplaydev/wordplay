import { expect, test } from 'vitest';
import { GallerySchema } from './Gallery';
import type { GalleryModeration as SharedModeration } from 'shared-types';

/**
 * `functions/` compiles with rootDir "src" and so cannot import the gallery
 * schema; it carries its own copy of the moderation union. A state added on one
 * side and not the other is a decision the server can write and the client
 * can't read, which is silent — so fail here instead.
 */
test('the shared moderation union matches the gallery schema', () => {
    const states = GallerySchema.shape.moderation.options;
    // Assigning each schema state to the shared type is the compile-time half:
    // a state missing from shared-types fails to build.
    const shared: SharedModeration[] = [...states];
    expect(shared.toSorted()).toEqual(
        (
            ['unrequested', 'pending', 'approved', 'denied'] as const
        ).toSorted() as string[],
    );
});
