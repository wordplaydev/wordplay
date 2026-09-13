import { describe, expect, it } from 'vitest';
import { decidedListing } from './moderate.js';

/**
 * Who a listing decision may come from (#906).
 *
 * `moderate` admits two kinds of decider — a platform moderator and a curator of
 * the gallery the thing is in — and applies whatever they send. That is right for
 * a takedown, which is what a curator is responsible for, and wrong for a listing:
 * a curator who could approve their own is what curation prevents.
 *
 * It has never mattered, because neither listable subject could reach a curator.
 * A how-to is the first one that sits in someone else's gallery, so this is where
 * that stops being luck.
 */
describe("a listing decision is the platform's", () => {
    it('is applied when a platform moderator makes it', () => {
        expect(decidedListing('approved', true)).toBe('approved');
        expect(decidedListing('denied', true)).toBe('denied');
    });

    it('is dropped when a curator makes it', () => {
        // Dropped rather than refused: the rest of the decision — the flags, the
        // remedy, the notices — is theirs to make and still applies.
        expect(decidedListing('approved', false)).toBeUndefined();
        expect(decidedListing('denied', false)).toBeUndefined();
    });

    it('stays absent when nobody asked for one', () => {
        expect(decidedListing(undefined, true)).toBeUndefined();
        expect(decidedListing(undefined, false)).toBeUndefined();
    });
});
