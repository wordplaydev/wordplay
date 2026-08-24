import { describe, expect, test } from 'vitest';
import {
    describeUsage,
    isTranslatorUsage,
    sumUsage,
    type TranslatorUsage,
} from './Translator';

const usage = (over: Partial<TranslatorUsage>): TranslatorUsage => ({
    model: 'claude-sonnet-5',
    requests: 10,
    inputTokens: 100_000,
    outputTokens: 50_000,
    cacheReadTokens: 900_000,
    cacheWriteTokens: 0,
    thinkingTokens: 0,
    cost: 1.23,
    ...over,
});

describe('describeUsage', () => {
    test('reports counts, cache share, and cost in one line', () => {
        const line = describeUsage(usage({}));
        expect(line).toContain('claude-sonnet-5');
        expect(line).toContain('10 requests');
        // Total input = 100k fresh + 900k cache read = 1.0M, 90% cached.
        expect(line).toContain('1.0M in (90% cached)');
        expect(line).toContain('50k out');
        expect(line).toContain('$1.23');
    });

    test('an unknown cost says so rather than showing $0', () => {
        expect(describeUsage(usage({ cost: undefined }))).toContain(
            'unknown $',
        );
    });

    test('thinking tokens are shown only when the model spent any', () => {
        expect(describeUsage(usage({}))).not.toContain('thinking');
        expect(describeUsage(usage({ thinkingTokens: 12_000 }))).toContain(
            '(12k thinking)',
        );
    });
});

describe('sumUsage', () => {
    test('combines entries per model, summing tokens and known costs', () => {
        const combined = sumUsage([
            usage({}),
            usage({ requests: 5, cost: 0.77 }),
            usage({ model: 'claude-opus-4-8', requests: 2, cost: 0.5 }),
        ]);
        expect(combined).toHaveLength(2);
        const sonnet = combined.find((u) => u.model === 'claude-sonnet-5');
        expect(sonnet?.requests).toBe(15);
        expect(sonnet?.inputTokens).toBe(200_000);
        expect(sonnet?.cost).toBeCloseTo(2.0);
    });

    test('a cost stays undefined only when no entry knows it', () => {
        const combined = sumUsage([
            usage({ cost: undefined }),
            usage({ cost: undefined }),
        ]);
        expect(combined[0].cost).toBeUndefined();
        const mixed = sumUsage([usage({ cost: undefined }), usage({})]);
        expect(mixed[0].cost).toBeCloseTo(1.23);
    });
});

describe('isTranslatorUsage', () => {
    test('accepts a real entry, with or without a cost', () => {
        expect(isTranslatorUsage(usage({}))).toBe(true);
        expect(isTranslatorUsage(usage({ cost: undefined }))).toBe(true);
    });

    test('rejects shapes that are not usage entries', () => {
        expect(isTranslatorUsage(null)).toBe(false);
        expect(isTranslatorUsage('claude-sonnet-5')).toBe(false);
        expect(isTranslatorUsage({ model: 'x', requests: 'many' })).toBe(false);
    });
});
