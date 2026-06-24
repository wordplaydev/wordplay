import { test, expect } from 'vitest';
import { Scripts } from '@locale/Scripts';

test('genuinely vertical scripts carry a vertical layout', () => {
    // Mongolian and Phags-pa are written top-to-bottom in left-to-right columns.
    expect(Scripts.Mong.layout).toBe('vertical-lr');
    expect(Scripts.Phag.layout).toBe('vertical-lr');
    // The vast majority of scripts remain horizontal.
    expect(Scripts.Latn.layout).toBe('horizontal-tb');
    expect(Scripts.Arab.layout).toBe('horizontal-tb');
});
