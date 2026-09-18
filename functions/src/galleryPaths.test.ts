import { describe, expect, it } from 'vitest';
import { MaxGalleryPathAliases } from './galleryPath';
import {
    galleryPathAction,
    isGalleryPathReservation,
    nextAliases,
    withoutName,
    type GalleryPathReservation,
} from './galleryPaths';

/** The decisions setGalleryPath makes, lifted out of the transaction so they
 *  can be tested without an emulator. */

function held(over: Partial<GalleryPathReservation> = {}) {
    return {
        v: 1,
        gallery: 'g1',
        path: 'kim-p4',
        claimed: 0,
        ...over,
    } satisfies GalleryPathReservation;
}

describe('galleryPathAction', () => {
    it('lets a gallery claim a name nobody holds', () => {
        expect(galleryPathAction(undefined, 'g1')).toBe('claim');
    });

    it('refuses a name another gallery holds', () => {
        expect(galleryPathAction(held({ gallery: 'g2' }), 'g1')).toBe('taken');
    });

    it('lets a gallery re-take a name it already holds, so a retry is safe', () => {
        expect(galleryPathAction(held(), 'g1')).toBe('own');
    });

    it('lets a gallery take back a name it superseded', () => {
        // A superseded reservation still points at its gallery, which is what
        // makes it an alias rather than a tombstone — so the gallery that
        // renamed away from it may rename back.
        expect(
            galleryPathAction(held({ supersededBy: 'kim-period-4' }), 'g1'),
        ).toBe('own');
    });

    it('refuses a retired name to everyone, forever', () => {
        // Its gallery is gone, so there is nobody it could be 'own' for. That
        // is the point of the tombstone: the URL was handed out.
        const retired = held({ gallery: null, retiredAt: 1 });
        expect(galleryPathAction(retired, 'g1')).toBe('taken');
        expect(galleryPathAction(retired, 'g2')).toBe('taken');
    });
});

describe('nextAliases', () => {
    it('keeps the list as it was when nothing is being retired', () => {
        expect(nextAliases(['a'], null)).toEqual(['a']);
    });

    it('puts the retiring name first', () => {
        expect(nextAliases(['a'], 'b')).toEqual(['b', 'a']);
    });

    it('does not repeat a name the list already holds', () => {
        // A gallery that renamed away, back, and away again must not collect
        // the same alias twice and spend its cap on one name.
        expect(nextAliases(['b', 'a'], 'b')).toEqual(['b', 'a']);
    });

    it('does not keep the name being adopted as an alias too', () => {
        // A gallery that renamed away and back would otherwise hold one name as
        // both its current path and a redirect to itself.
        expect(nextAliases(['kim-p4'], 'kim-period-4', 'kim-p4')).toEqual([
            'kim-period-4',
        ]);
        // And renaming to what it already has changes nothing.
        expect(nextAliases(['old'], 'kim-p4', 'kim-p4')).toEqual(['old']);
    });

    it('drops the oldest past the cap', () => {
        // The array rides on a document every visitor reads, so it is bounded —
        // and dropping the oldest costs a stale redirect, never the name, which
        // the reservation holds permanently.
        const many = Array.from(
            { length: MaxGalleryPathAliases },
            (_, i) => `a${i}`,
        );
        const next = nextAliases(many, 'newest');
        expect(next).toHaveLength(MaxGalleryPathAliases);
        expect(next[0]).toBe('newest');
        expect(next).not.toContain(`a${MaxGalleryPathAliases - 1}`);
    });
});

describe('isGalleryPathReservation', () => {
    it('accepts the shapes that exist', () => {
        expect(isGalleryPathReservation(held())).toBe(true);
        expect(
            isGalleryPathReservation(held({ gallery: null, retiredAt: 1 })),
        ).toBe(true);
        expect(isGalleryPathReservation(held({ supersededBy: 'x' }))).toBe(
            true,
        );
    });

    it('refuses anything else, since a document is data until it is checked', () => {
        expect(isGalleryPathReservation(undefined)).toBe(false);
        expect(isGalleryPathReservation({ v: 2, gallery: 'g1' })).toBe(false);
        expect(isGalleryPathReservation(held({ claimed: undefined }))).toBe(
            false,
        );
    });
});

describe('withoutName', () => {
    it('takes a released alias out of the list', () => {
        expect(withoutName('kim-p5', ['kim-p4', 'kim-old'], 'kim-p4')).toEqual({
            path: 'kim-p5',
            pathAliases: ['kim-old'],
        });
    });

    it('does not leave a released current name behind as an alias', () => {
        // The difference between releasing and clearing. Clearing retires the
        // name into pathAliases so the old link still resolves; releasing hands
        // it back, and a redirect to a name somebody else may now hold is
        // exactly what must not happen.
        expect(withoutName('kim-p4', ['kim-old'], 'kim-p4')).toEqual({
            path: null,
            pathAliases: ['kim-old'],
        });
    });

    it('removes a name held as both the path and an alias', () => {
        // nextAliases already prevents this pairing, so this is about not
        // leaving half of one behind if it ever arises.
        expect(withoutName('kim-p4', ['kim-p4'], 'kim-p4')).toEqual({
            path: null,
            pathAliases: [],
        });
    });

    it('leaves a gallery alone when the name is not one of its own', () => {
        expect(withoutName('kim-p4', ['kim-old'], 'someone-else')).toEqual({
            path: 'kim-p4',
            pathAliases: ['kim-old'],
        });
    });
});

describe('what may be released', () => {
    // releaseGalleryPath refuses anything galleryPathAction does not call
    // 'own', so these are the arms that decide it.
    it('refuses a name no reservation holds, since there is nothing to give up', () => {
        expect(galleryPathAction(undefined, 'g1')).not.toBe('own');
    });

    it("refuses another gallery's name", () => {
        expect(galleryPathAction(held({ gallery: 'g2' }), 'g1')).not.toBe(
            'own',
        );
    });

    it("refuses a tombstone, so a deleted gallery's name stays dead", () => {
        // retireGalleryPaths nulls the gallery, so no id matches and a retired
        // name can never be released back into the pool by anyone.
        expect(
            galleryPathAction(held({ gallery: null, retiredAt: 1 }), 'g1'),
        ).not.toBe('own');
    });

    it('allows a name this gallery superseded but still holds', () => {
        expect(galleryPathAction(held({ supersededBy: 'kim-p5' }), 'g1')).toBe(
            'own',
        );
    });
});
