import { describe, expect, it } from 'vitest';
import {
    GallerySchema,
    GallerySchemaLatestVersion,
    deserializeGallery,
    upgradeGallery,
} from './Gallery';

/**
 * Upgrade-on-load coverage for galleries. Old gallery docs in Firestore are
 * upgraded when read (deserializeGallery → upgradeGallery), so a regression in
 * the upgrade chain silently corrupts every pre-v2 gallery on load. These tests
 * pin the v1 → v2 (how-to space) migration the way Project.persistence pins the
 * project chain and HowToDatabase pins upgradeHowTo.
 */

/** A minimal v1 gallery doc — the shape that predates the how-to space. */
function makeV1() {
    return {
        v: 1 as const,
        id: 'g1',
        path: null,
        name: { 'en-US': 'My Gallery' },
        description: { 'en-US': 'A theme' },
        words: ['my', 'gallery'],
        projects: ['p1', 'p2'],
        curators: ['u-curator'],
        creators: ['u-creator'],
        public: true,
        featured: false,
    };
}

describe('upgradeGallery (upgrade-on-load)', () => {
    it('upgrades a v1 doc to the latest version with empty how-to defaults', () => {
        const upgraded = upgradeGallery(makeV1());
        expect(upgraded.v).toBe(GallerySchemaLatestVersion);
        // Every field added in v2 gets a safe empty default.
        expect(upgraded.howTos).toEqual([]);
        expect(upgraded.howToExpandedVisibility).toBe(false);
        expect(upgraded.howToExpandedGalleries).toEqual([]);
        expect(upgraded.howToViewers).toEqual({});
        expect(upgraded.howToViewersFlat).toEqual([]);
        expect(upgraded.howToGuidingQuestions).toEqual([]);
        expect(upgraded.howToReactions).toEqual({});
    });

    it('preserves v1 user data across the upgrade', () => {
        const upgraded = upgradeGallery(makeV1());
        expect(upgraded.id).toBe('g1');
        expect(upgraded.name).toEqual({ 'en-US': 'My Gallery' });
        expect(upgraded.description).toEqual({ 'en-US': 'A theme' });
        expect(upgraded.projects).toEqual(['p1', 'p2']);
        expect(upgraded.curators).toEqual(['u-curator']);
        expect(upgraded.creators).toEqual(['u-creator']);
        expect(upgraded.public).toBe(true);
        expect(upgraded.featured).toBe(false);
    });

    it('upgraded doc parses against the latest schema', () => {
        expect(() =>
            GallerySchema.parse(upgradeGallery(makeV1())),
        ).not.toThrow();
    });

    it('an already-latest doc upgrades to itself', () => {
        const v2 = upgradeGallery(makeV1());
        expect(upgradeGallery(v2)).toEqual(v2);
    });

    it('throws on an unknown future version', () => {
        // A doc claiming a version the client doesn't know must fail loudly
        // rather than be silently mishandled.
        const future = { ...upgradeGallery(makeV1()), v: 999 };
        // @ts-expect-error — deliberately invalid version for the test.
        expect(() => upgradeGallery(future)).toThrow();
    });

    it('deserializeGallery upgrades a raw v1 doc into a usable Gallery', () => {
        const gallery = deserializeGallery(makeV1());
        expect(gallery.data.v).toBe(GallerySchemaLatestVersion);
        expect(gallery.getID()).toBe('g1');
    });
});
