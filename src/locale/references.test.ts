import DefaultLocale from '@locale/DefaultLocale';
import { parseLocaleDoc } from '@locale/LocaleText';
import ConceptLink from '@nodes/ConceptLink';
import { getKeyTemplatePairs } from '@util/verify-locales/LocalePath';
import { expect, test } from 'vitest';

test('every reference in en-US resolves', () => {
    // A reference that resolves to nothing renders as the unknown-character
    // glyph, in the Guide and anywhere else the doc appears (#1245). The
    // verifier checks all 30 locales at CI time; this catches en-US in the
    // ordinary test run, where the mistake is introduced.
    const broken: string[] = [];
    for (const pair of getKeyTemplatePairs(
        DefaultLocale as unknown as Record<string, unknown>,
    )) {
        const values = Array.isArray(pair.value) ? pair.value : [pair.value];
        for (const value of values) {
            if (typeof value !== 'string' || !value.includes('@')) continue;
            for (const node of parseLocaleDoc(value).nodes())
                if (node instanceof ConceptLink && node.isBroken(DefaultLocale))
                    broken.push(`${pair.toString()}: @${node.getName()}`);
        }
    }
    expect(broken).toEqual([]);
});
