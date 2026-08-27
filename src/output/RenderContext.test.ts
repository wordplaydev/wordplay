import concretize from '@locale/concretize';
import DefaultLocale from '@locale/DefaultLocale';
import Locales from '@locale/Locales';
import RenderContext from '@output/RenderContext';
import { expect, test } from 'vitest';

/**
 * `withFontAndSize` is called for every nested output, so a field it forgets to
 * carry silently stops applying below the stage's own children. `adapting` is
 * the one where that would look like a contrast bug rather than a layout one.
 */
test('withFontAndSize carries every field but font and size', () => {
    const locales = new Locales(concretize, [DefaultLocale], DefaultLocale);
    const context = new RenderContext(
        'Noto Sans',
        12,
        locales,
        new Set(),
        1,
        'horizontal-tb',
        true,
        true,
    );
    const derived = context.withFontAndSize('Noto Serif', 24);
    expect(derived.face).toBe('Noto Serif');
    expect(derived.size).toBe(24);
    expect(derived.adapting).toBe(true);
    expect(derived.placeholders).toBe(true);
    expect(derived.animationFactor).toBe(context.animationFactor);
    expect(derived.layout).toBe(context.layout);
    expect(derived.fonts).toBe(context.fonts);
    expect(derived.locales).toBe(context.locales);
});
