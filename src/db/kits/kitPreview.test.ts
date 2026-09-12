import DefaultLocales from '@locale/DefaultLocales';
import Source from '@nodes/Source';
import { expect, test } from 'vitest';
import {
    kitDescription,
    kitPreviewSource,
    pickKitPreviewExample,
} from './kitPreview';

function picked(code: string) {
    const example = pickKitPreviewExample(new Source('colors', code));
    return example?.program.toWordplay().trim();
}

test('a starred example wins wherever it is', () => {
    expect(
        picked(`¶A palette. \\1\\¶\n\n¶Warm. \\3\\⭐¶\n↑ sunset/en: 1`),
    ).toBe('3');
});

test("with none starred, the source's own doc goes first", () => {
    // A kit's headline example belongs in the description someone reads first.
    expect(picked(`¶A palette. \\1\\¶\n\n¶Warm. \\3\\¶\n↑ sunset/en: 1`)).toBe(
        '1',
    );
});

test("with none in the source's doc, an export's is used", () => {
    // The fallback that keeps a kit of plain values from having no preview.
    expect(picked(`¶A palette.¶\n\n¶Warm. \\3\\¶\n↑ sunset/en: 1`)).toBe('3');
});

test('with none anywhere there is nothing to pick', () => {
    // Which is what `UnexampledKit` refuses to publish, so a published kit always has one.
    expect(picked(`¶A palette.¶\n\n¶Warm.¶\n↑ sunset/en: 1`)).toBeUndefined();
});

test("a preview evaluates the example in the kit's own scope", () => {
    // An example in a kit's docs means what it means *there*: built from the example
    // alone, `sunset` would be an unknown name and the tile would render nothing.
    const source = new Source(
        'colors',
        `¶A palette. \\sunset\\¶\n\n¶Warm.¶\n↑ sunset/en: 42`,
    );
    const example = pickKitPreviewExample(source);
    expect(example).toBeDefined();
    const preview = kitPreviewSource(source, example!);
    expect(preview.getCode().toString()).toContain('↑ sunset/en: 42');
    expect(preview.getCode().toString().trimEnd().endsWith('sunset')).toBe(
        true,
    );
});

test("a kit's description is the first sentence of its source's doc", () => {
    expect(
        kitDescription(
            new Source(
                'colors',
                `¶Warm colours for a sunset. Use them together.¶\n\n↑ sunset/en: 1`,
            ),
            DefaultLocales,
        ),
    ).toBe('Warm colours for a sunset.');
});

test('a source with no doc has no description', () => {
    expect(
        kitDescription(new Source('colors', `↑ a/en: 1`), DefaultLocales),
    ).toBe('');
});
