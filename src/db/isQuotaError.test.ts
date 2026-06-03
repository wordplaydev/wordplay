import { describe, expect, it } from 'vitest';
import isQuotaError from './isQuotaError';

describe('isQuotaError', () => {
    it('matches a raw QuotaExceededError DOMException', () => {
        expect(isQuotaError(new DOMException('full', 'QuotaExceededError'))).toBe(
            true,
        );
    });

    it('matches the Firefox NS_ERROR_DOM_QUOTA_REACHED name', () => {
        expect(
            isQuotaError(new DOMException('full', 'NS_ERROR_DOM_QUOTA_REACHED')),
        ).toBe(true);
    });

    it('matches a Dexie-style error whose own name is QuotaExceededError', () => {
        expect(isQuotaError({ name: 'QuotaExceededError' })).toBe(true);
    });

    it('matches a Dexie error wrapping the quota error in `inner`', () => {
        expect(
            isQuotaError({
                name: 'AbortError',
                inner: { name: 'QuotaExceededError' },
            }),
        ).toBe(true);
    });

    it('does not match an unrelated DOMException', () => {
        expect(isQuotaError(new DOMException('nope', 'DataCloneError'))).toBe(
            false,
        );
    });

    it('does not match ordinary errors or non-objects', () => {
        expect(isQuotaError(new Error('boom'))).toBe(false);
        expect(isQuotaError({ name: 'TypeError' })).toBe(false);
        expect(isQuotaError(null)).toBe(false);
        expect(isQuotaError(undefined)).toBe(false);
        expect(isQuotaError('QuotaExceededError')).toBe(false);
    });
});
