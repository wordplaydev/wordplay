import { Faces } from '@basis/faces/faces.generated';
import { FontManifest } from '@basis/faces/fonts.manifest';
import {
    describeFace,
    describeFaceLocalized,
    describeFaceWithName,
    FaceForms,
    FaceImpressions,
    MaxImpressions,
    renderFaceDescription,
    ShortLowercase,
    TallLowercase,
    type FaceForm,
} from '@basis/faces/faceWords';
import type { Face } from '@basis/faces/Fonts';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import { describe, expect, test } from 'vitest';

/** A minimal face to hang measurements on. */
function face(extra: Partial<Face> = {}): Face {
    return {
        weights: [400],
        italic: false,
        scripts: ['Latn'],
        format: 'woff2',
        ...extra,
    };
}

describe('the vocabulary is complete', () => {
    test('every pickable face has a form', () => {
        // Adding a font to the manifest without words should fail here rather
        // than ship a face the chooser can only name.
        const missing = Object.entries(Faces)
            .filter(([, f]) => f.form === undefined)
            .map(([name]) => name);
        expect(missing).toEqual([]);
    });

    test('every pickable face except emoji has an impression', () => {
        // Emoji faces are the one honest exception: they aren't letters, so
        // there's no letterform to have a feeling about.
        const missing = Object.entries(Faces)
            .filter(
                ([, f]) =>
                    f.form !== 'emoji' &&
                    (f.impression === undefined || f.impression.length === 0),
            )
            .map(([name]) => name);
        expect(missing).toEqual([]);
    });

    test('no face claims more words than we will say', () => {
        for (const [name, f] of Object.entries(Faces))
            expect(
                (f.impression ?? []).length,
                `${name} has too many impressions`,
            ).toBeLessThanOrEqual(MaxImpressions);
    });

    test('every authored word is one the locale can render', () => {
        const text = DefaultLocale.ui.font;
        for (const entry of FontManifest) {
            if (entry.form !== undefined)
                expect(text.form[entry.form], entry.name).toBeDefined();
            for (const word of entry.impression ?? [])
                expect(text.impression[word], entry.name).toBeDefined();
        }
    });

    test('the locale defines every term and no others', () => {
        expect(Object.keys(DefaultLocale.ui.font.form).sort()).toEqual(
            [...FaceForms].sort(),
        );
        expect(Object.keys(DefaultLocale.ui.font.impression).sort()).toEqual(
            [...FaceImpressions].sort(),
        );
    });
});

describe('measurements become mechanics', () => {
    test('a monospaced face says so', () => {
        expect(describeFace(face({ mono: true })).mechanics).toContain(
            'sameWidth',
        );
    });

    test('lowercase height is bucketed, and the middle says nothing', () => {
        expect(
            describeFace(face({ ratio: TallLowercase })).mechanics,
        ).toContain('tallLowercase');
        expect(
            describeFace(face({ ratio: ShortLowercase })).mechanics,
        ).toContain('shortLowercase');
        // 0.75 is where most text faces sit; saying so about all of them would
        // be noise rather than description.
        expect(describeFace(face({ ratio: 0.75 })).mechanics).toEqual([]);
    });

    test('an unmeasured face claims nothing', () => {
        expect(describeFace(face()).mechanics).toEqual([]);
    });
});

describe('rendering', () => {
    test('reads as one clause list', () => {
        expect(
            renderFaceDescription(DefaultLocales, {
                form: 'textured',
                impressions: ['strong', 'oldFashioned'],
                mechanics: ['tallLowercase'],
            }),
        ).toBe(
            'a textured face, strong and old-fashioned, small letters as tall as the capitals',
        );
    });

    test('an absent clause leaves no separator behind', () => {
        // A template's `$x[…|…]` treats '' as present, so an empty clause used
        // to emit a bare ", " — this is that regression.
        const only = renderFaceDescription(DefaultLocales, {
            form: 'emoji',
            impressions: [],
            mechanics: [],
        });
        expect(only).toBe('pictures, not letters');
        expect(only).not.toMatch(/,\s*$/);
    });

    test('goes through the locale rather than concatenating', () => {
        // Every word in the output has to come from locale text, so a locale
        // can reorder and rejoin them.
        const rendered = renderFaceDescription(DefaultLocales, {
            form: 'sans',
            impressions: ['calm'],
            mechanics: [],
        });
        expect(rendered).toContain(DefaultLocale.ui.font.form.sans);
        expect(rendered).toContain(DefaultLocale.ui.font.impression.calm);
    });

    test('every form term renders to something', () => {
        for (const form of FaceForms)
            expect(
                renderFaceDescription(DefaultLocales, {
                    form: form as FaceForm,
                    impressions: [],
                    mechanics: [],
                }).length,
                form,
            ).toBeGreaterThan(0);
    });

    test('describes a real face', () => {
        expect(describeFaceLocalized(DefaultLocales, Faces['Creepster'])).toBe(
            'a textured face, strong and old-fashioned, small letters as tall as the capitals',
        );
    });
});

describe('naming', () => {
    test('a known face is named and shaped, but not fully described', () => {
        // Only the form: this is re-spoken every time a phrase changes.
        expect(describeFaceWithName(DefaultLocales, 'Courier Prime')).toBe(
            'Courier Prime, a typewriter face',
        );
    });

    test('a face we have no words for keeps its name', () => {
        expect(describeFaceWithName(DefaultLocales, 'Some Creator Font')).toBe(
            'Some Creator Font',
        );
    });

    test('no face at all describes nothing', () => {
        expect(describeFaceWithName(DefaultLocales, undefined)).toBeUndefined();
    });
});
