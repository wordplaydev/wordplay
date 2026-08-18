import { readFileSync } from 'fs';
import path from 'path';
import { expect, test } from 'vitest';
import DefaultLocales from '@locale/DefaultLocales';
import {
    ExampleGalleries,
    ExamplePrefix,
} from '../../functions/src/preview/shared';
import {
    ExamplePrefix as SrcExamplePrefix,
    getExampleGalleries,
} from './examples';

/**
 * The preview/sitemap functions cannot import src/, so
 * functions/src/preview/shared.ts carries a copy of the example-gallery
 * manifest. These tests fail when the copy drifts from the source of truth
 * here and in en-US.json.
 */

test('the functions example manifest matches examples.ts', () => {
    expect(ExamplePrefix).toBe(SrcExamplePrefix);

    const galleries = getExampleGalleries(DefaultLocales);
    expect(Object.keys(ExampleGalleries).sort()).toEqual(
        galleries.map((gallery) => gallery.getID()).sort(),
    );
    for (const gallery of galleries) {
        const info = ExampleGalleries[gallery.getID()];
        expect(info, `manifest entry for ${gallery.getID()}`).toBeDefined();
        expect(
            gallery
                .getProjects()
                .map((id) => id.substring(ExamplePrefix.length)),
        ).toEqual(info.projects);
        expect(info.name).toBe(gallery.data.name['en-US']);
        expect(info.description).toBe(gallery.data.description['en-US']);
    }
});

test('the functions example manifest locale keys match en-US.json', () => {
    const enUS = JSON.parse(
        readFileSync(path.join('src', 'locale', 'en-US.json'), 'utf8'),
    ) as { gallery: Record<string, { name: string; description: string }> };
    for (const id of Object.keys(ExampleGalleries)) {
        const info = ExampleGalleries[id];
        const text = enUS.gallery[info.localeKey];
        expect(text, `en-US gallery text for ${info.localeKey}`).toBeDefined();
        expect(info.name).toBe(text.name);
        expect(info.description).toBe(text.description);
    }
});
