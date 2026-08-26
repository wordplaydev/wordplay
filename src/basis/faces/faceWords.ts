import type Locales from '@locale/Locales';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import type { Face, SupportedFace } from '@basis/faces/Fonts';
// The generated registry directly, not Fonts.ts, which imports this module for
// its own description helper — importing it back would close a cycle.
import { Faces } from '@basis/faces/faces.generated';

/**
 * The words we say a typeface looks like.
 *
 * Built the way {@link ../../output/Color/BasicColors.ts} is built, and for the
 * same reason: a visual property nobody can hear needs a small, fixed vocabulary
 * that classification code chooses from and locale templates render, rather than
 * a sentence per font. Wordplay ships in thirty languages — thirty terms
 * translate once and hold when a font is added, where sixty hand-written
 * descriptions would need translating again every time the catalogue changed.
 * Eleven basic colour terms already carry every colour description in the app.
 *
 * Three facets, and they are different kinds of claim, which is why they are
 * separate lists rather than one bag of adjectives:
 *
 *  - **Form** is a closed category — exactly one per face, describing the shape
 *    of the letters. Authored, because it is a judgment about a design.
 *  - **Impression** is what the face *feels* like. Also authored, and the part a
 *    creator who cannot see the face has no other way to learn.
 *  - **Mechanics** are measured from the font file. No judgment involved, so
 *    they are derived rather than authored, and they change when a font is
 *    swapped.
 */

/** The shape of the letters. Exactly one per face. */
export const FaceForms = [
    'sans',
    'serif',
    'slab',
    'typewriter',
    'handwriting',
    'brush',
    'script',
    'poster',
    'pixel',
    'outline',
    'textured',
    'emoji',
] as const;
export type FaceForm = (typeof FaceForms)[number];

/**
 * What the face feels like. At most two per face, most important first.
 *
 * Derived from Google Fonts' hand-curated expressive tags and then cut and
 * renamed against our own catalogue, because the raw tags don't survive contact
 * with it: at their published scores, "Rugged" applies to 27 of our 56 tagged
 * faces and says nothing. Five tags earned no word here — "Loud" lands on Modak
 * and Roboto alike (it tracks having a bold weight, not looking loud), "Sincere"
 * covers a serif, a comic face, handwriting, a script and a typewriter at once,
 * and "Sophisticated", "Innovative" and "Stiff" fit nothing we ship. Three more
 * collapsed into `calm`, having been the same seven fonts three times over.
 */
export const FaceImpressions = [
    'calm',
    'oldFashioned',
    'strong',
    'quirky',
    'playful',
    'excited',
    'childlike',
    'artistic',
    'futuristic',
    'energetic',
    'cute',
    'cheerful',
    'fancy',
] as const;
export type FaceImpression = (typeof FaceImpressions)[number];

/** Facts measured from the font file rather than judged. */
export const FaceMechanics = [
    'sameWidth',
    'tallLowercase',
    'shortLowercase',
] as const;
export type FaceMechanic = (typeof FaceMechanics)[number];

/**
 * Where the lowercase has to sit, relative to the capitals, to be worth saying.
 *
 * Deliberately *not* framed as legibility. Creepster measures exactly 1.00 and
 * its `a` and `A` really are different glyphs of the same height — a display
 * face whose lowercase is drawn at cap height, not a face that reads well small.
 * No face a creator can pick is capitals-only, so the honest thing to say is
 * where the small letters sit.
 */
export const TallLowercase = 0.9;
export const ShortLowercase = 0.45;

/** How many impressions we'll say. Two is a description; four is a list. */
export const MaxImpressions = 2;

export type FaceDescription = {
    readonly form: FaceForm | undefined;
    readonly impressions: readonly FaceImpression[];
    readonly mechanics: readonly FaceMechanic[];
};

/** What a face looks like, in vocabulary rather than words. Locale-free. */
export function describeFace(face: Face): FaceDescription {
    const mechanics: FaceMechanic[] = [];
    if (face.mono) mechanics.push('sameWidth');
    if (face.ratio !== undefined) {
        if (face.ratio >= TallLowercase) mechanics.push('tallLowercase');
        else if (face.ratio <= ShortLowercase) mechanics.push('shortLowercase');
    }
    return {
        form: face.form,
        impressions: (face.impression ?? []).slice(0, MaxImpressions),
        mechanics,
    };
}

/** Join a list of words with the locale's own conjunction, never a comma we
 *  chose for it. */
function join(locales: Locales, words: string[]): string | undefined {
    if (words.length === 0) return undefined;
    if (words.length === 1) return words[0];
    return words.slice(1).reduce(
        (first, second) =>
            locales
                .concretize((l) => l.ui.font.description.and, {
                    first,
                    second,
                })
                .toText(),
        words[0],
    );
}

/** Render a description into the locale's own words and word order. */
export function renderFaceDescription(
    locales: Locales,
    description: FaceDescription,
): string {
    const text = locales.getLocale().ui.font;
    // Undefined, never '': a template's `$x[…|…]` treats an empty string as
    // present and emits the separator anyway, which left emoji faces reading
    // "pictures, not letters. ." — a clause with nothing in it.
    // Stripped, because these are read straight off the locale rather than
    // through a getter: a machine-translated value still carries its "$~" write
    // marker, and concretize only strips the one on the template itself.
    const word = (value: string) => withoutAnnotations(value).trim();
    const form =
        description.form === undefined
            ? undefined
            : word(text.form[description.form]);
    const impression = join(
        locales,
        description.impressions.map((i) => word(text.impression[i])),
    );
    const mechanics = join(
        locales,
        description.mechanics.map((m) => word(text.mechanic[m])),
    );
    return locales
        .concretize((l) => l.ui.font.description.full, {
            form,
            impression,
            mechanics,
        })
        .toText()
        .trim();
}

/** A face's description, in the locale's words. */
export function describeFaceLocalized(locales: Locales, face: Face): string {
    return renderFaceDescription(locales, describeFace(face));
}

/**
 * A face named and shaped, for output that speaks itself.
 *
 * Only the form, not the whole description: this rides along in a phrase's
 * description, which is re-spoken every time the phrase changes, and "a textured
 * face, strong and old-fashioned, small letters as tall as the capitals" said
 * after every edit is a wall rather than a help. What the face *is* is the part
 * that can't be guessed from its name; the rest is in the chooser, where a
 * creator is looking for it.
 *
 * There is no such thing as an unsupported face here: `Phrase.face` is typed as
 * the union of every face name, so a name outside it doesn't merely conflict —
 * the whole evaluation becomes an exception and no `Phrase` is built at all. The
 * lookup is still guarded, because `SupportedFace` is `keyof Record<string,
 * Face>` and so narrows nothing: without the guard an unexpected name would
 * crash rather than fall back to itself. `form` is separately optional because
 * fallback faces share the `Face` type and are never chosen; `faceWords.test.ts`
 * requires one on every face that can be.
 */
export function describeFaceWithName(
    locales: Locales,
    name: SupportedFace | undefined,
): string | undefined {
    if (name === undefined) return undefined;
    const face: Face | undefined = Faces[name];
    if (face?.form === undefined) return name;
    const form = face.form;
    return `${name}, ${withoutAnnotations(
        locales.getLocale().ui.font.form[form],
    ).trim()}`;
}
