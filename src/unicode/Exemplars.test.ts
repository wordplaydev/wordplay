import { expect, test } from 'vitest';
import { resolveExemplars } from '@unicode/Exemplars';

test('resolveExemplars prefers region-specific variants', () => {
    const data = new Map<string, string[]>([
        ['zh', ['日']],
        ['zh_Hant', ['本']],
    ]);
    // Chinese in Taiwan resolves to the Traditional Chinese characters...
    expect(resolveExemplars(data, 'zh', 'TW')).toEqual(['本']);
    // ...while regionless (or other-region) Chinese gets the base entry.
    expect(resolveExemplars(data, 'zh', undefined)).toEqual(['日']);
    expect(resolveExemplars(data, 'zh', 'CN')).toEqual(['日']);
    // A language with no entry resolves to nothing.
    expect(resolveExemplars(data, 'en', undefined)).toBeUndefined();
});
