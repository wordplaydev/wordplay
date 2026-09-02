import Gallery, { GallerySchemaLatestVersion } from '@db/galleries/Gallery';
import { moderatedFlags } from '@db/projects/Moderation';
import {
    ProjectSchemaLatestVersion,
    type SerializedPreview,
    type SerializedProject,
} from '@db/projects/ProjectSchemas';
import type { GalleryText } from '@locale/GalleryTexts';
import { localeToString } from '@locale/Locale';
import type Locales from '@locale/Locales';
import { parseNames } from '@parser/parseBind';
import { toTokens } from '@parser/toTokens';
import UnicodeString from '@unicode/UnicodeString';

/** This mirrors the static path to examples, but also helps distinguish project IDs from example project names. */
export const ExamplePrefix = 'example-';

/**
 * `.wp` example files may optionally begin with a single-grapheme preview
 * glyph on its own line, before the project title. If present, it ships as
 * the project's persisted preview (mode: 'auto', value precomputed at build
 * time by scripts/precompute-previews.ts). Legacy files without a preview
 * line fall through to the on-demand preview queue.
 */
function parsePreviewLine(line: string): string | undefined {
    const trimmed = line.trim();
    if (trimmed.length === 0) return undefined;
    const us = new UnicodeString(trimmed);
    return us.getLength() === 1 ? trimmed : undefined;
}

export function parseSerializedProject(
    project: string,
    id: string,
    /**
     * When given, the project's declared locales, overriding the tags derived
     * from source-header names. A per-locale translation of an example can't
     * always self-declare through its headers: a master like AnimatedName tags
     * its source names pedagogically, so header tags describe content, not the
     * file's language.
     */
    locales?: string[],
): SerializedProject {
    let lines = project.split('\n');

    // Optional preview-glyph first line. If present, peel it off so the
    // second line is the project name as in the legacy format.
    const previewGlyph = parsePreviewLine(lines[0] ?? '');
    if (previewGlyph !== undefined) lines = lines.slice(1);

    // Reconstruct the remainder for downstream `===`-splitting.
    const body = lines.join('\n');
    const rest = body.substring(lines.slice(0, 1).join().length + 1);

    // The first line of the (possibly peeled) body is the project name.
    const name = lines[0].trim();

    // Split the file by "===" lines
    const files = rest.split(/(?==== .*\n)/g);

    // Split the files by header and code
    const languages: Set<string> = new Set();

    const sources = files.map((file) => {
        const EOL = file.indexOf('\n') + 1;
        const header = file.substring(0, EOL);
        const names = header.replace('===', '').trim();
        const code = file.substring(EOL);
        for (const name of parseNames(toTokens(names)).names) {
            const locale = name.language?.getLocaleID();
            if (locale) languages.add(localeToString(locale));
        }
        return { names, code, caret: 0 };
    });

    const preview: SerializedPreview | undefined =
        previewGlyph !== undefined
            ? {
                  mode: 'auto',
                  text: previewGlyph,
                  foreground: null,
                  background: null,
                  face: null,
                  characterName: null,
              }
            : undefined;

    // Return stuff for display
    return {
        v: ProjectSchemaLatestVersion,
        name,
        id,
        sources: sources,
        locales:
            locales !== undefined && locales.length > 0
                ? locales
                : languages.size === 0
                  ? ['en-US']
                  : Array.from(languages),
        owner: null,
        collaborators: [],
        public: true,
        listed: true,
        archived: false,
        persisted: false,
        timestamp: Date.now(),
        gallery: null,
        flags: moderatedFlags(),
        nonPII: [],
        chat: null,
        history: [],
        restrictedGallery: false,
        viewers: [],
        commenters: [],
        // Omit the key when there's no preview glyph; `preview` is exactly
        // optional, and Firestore rejects an undefined field value.
        ...(preview !== undefined && { preview }),
        stamps: { lamport: 0, fields: {} },
        crdt: null,
        remixOf: null,
        // An example is nobody's project to organize or consent for; it is
        // read-only and never persisted (see ProjectsDatabase.get).
        folder: null,
        researchConsent: false,
    };
}

/** Fetch one `.wp` file, or undefined if it doesn't exist or isn't one. */
async function fetchExampleFile(url: string): Promise<string | undefined> {
    const response = await fetch(url);
    if (!response.ok) return undefined;
    const text = await response.text();
    // A hosting SPA fallback can serve HTML with a 200; never parse markup as a project.
    if (text.trimStart().startsWith('<')) return undefined;
    return text;
}

/**
 * Asynchronously fetch the example, in the viewer's chosen locales when
 * translations exist (#1310). Each locale's translation is a complete
 * rewrite-mode file at `/examples/<locale>/<Name>.wp`; one chosen locale is
 * served directly, several are composited into one multilingual project, and
 * a locale without a file falls back to the en-US master. This shapes only
 * read-only example loading — a persisted project's locales are never derived
 * from the viewer's (#1246).
 */
export async function getExample(
    id: string,
    /** The viewer's chosen locale codes, in preference order. Empty = the
     *  en-US master, as before per-locale translations existed. */
    locales: string[] = [],
): Promise<SerializedProject | undefined> {
    const name = id.split('-')[1];
    try {
        const chosen = locales.filter(
            (locale, index) => locales.indexOf(locale) === index,
        );
        const translated = chosen.filter((locale) => locale !== 'en-US');
        const [master, ...translations] = await Promise.all([
            fetchExampleFile(`/examples/${name}.wp`),
            ...translated.map((locale) =>
                fetchExampleFile(`/examples/${locale}/${name}.wp`),
            ),
        ]);
        if (master === undefined) return undefined;

        // The available representation of each chosen locale, in preference
        // order: its translation, or the master for en-US itself.
        const inputs = chosen.flatMap((locale) => {
            if (locale === 'en-US') return [{ locale, text: master }];
            const text = translations[translated.indexOf(locale)];
            return text === undefined ? [] : [{ locale, text }];
        });

        // Nothing translated (or no locales given): the master, as always.
        if (inputs.length === 0) return parseSerializedProject(master, id);

        // A viewer whose primary locale has no translation reads the en-US
        // fallback, so the master becomes the base with the rest appended.
        if (
            inputs[0].locale !== chosen[0] &&
            !inputs.some((input) => input.locale === 'en-US')
        )
            inputs.unshift({ locale: 'en-US', text: master });

        // One available locale: serve its file directly, declaring the locale
        // it was fetched for (its headers can't always self-declare).
        if (inputs.length === 1)
            return parseSerializedProject(
                inputs[0].text,
                id,
                inputs[0].locale === 'en-US' ? undefined : [inputs[0].locale],
            );

        // Several: composite them. Dynamically imported because compositing
        // parses sources, and examples.ts is statically reachable from every
        // page through the database — the import budget
        // (importGraph.test.ts) is why.
        const { compositeExample } = await import('./compositeExample');
        const [base, ...secondaries] = inputs.map((input) => ({
            locale: input.locale,
            project: parseSerializedProject(
                input.text,
                id,
                input.locale === 'en-US' ? undefined : [input.locale],
            ),
        }));
        return compositeExample(id, base, secondaries);
    } catch (error) {
        console.error(error);
        return undefined;
    }
}

function createGallery(
    id: string,
    text: Record<string, GalleryText>,
    projects: string[],
    locales: Locales,
) {
    return new Gallery({
        v: GallerySchemaLatestVersion,
        id,
        path: id,
        name: Object.fromEntries(
            Object.entries(text).map(([locale, t]) => [locale, t.name]),
        ),
        description: Object.fromEntries(
            Object.entries(text).map(([locale, t]) => [locale, t.description]),
        ),
        words: [],
        projects: projects.map((name) => ExamplePrefix + name),
        curators: [],
        creators: [],
        public: true,
        featured: true,
        // The developers' own galleries, so already curated. `words` stays
        // empty on purpose: their projects are searched in full rather than
        // through the prefilter it exists for.
        moderation: 'approved',
        moderatedAt: null,
        flags: moderatedFlags(),
        howTos: [],
        howToExpandedVisibility: false,
        howToExpandedGalleries: [],
        howToViewers: {},
        howToViewersFlat: [],
        howToGuidingQuestions: locales.getUnannotatedTexts(
            (l) => l.ui.howto.configuration.guidingQuestions.default,
        ),
        howToReactions: locales.getTextStructure(
            (l) => l.ui.howto.configuration.reactions.default,
        ),
    });
}

export function getExampleGalleries(locales: Locales): Gallery[] {
    const locale = locales.getLocales();
    return [
        createGallery(
            'Games',
            Object.fromEntries(
                locale.map((l) => [localeToString(l), l.gallery.games]),
            ),
            [
                'HeartAttack',
                'ShowAndTell',
                'BuildingBlocks',
                'Adventure',
                'BasketballStar',
                'HummingBird',
                'Maze',
                'WhatWord',
                'Catch',
                'Madlib',
                'WheresWaldough',
                'KatakanaGuess',
                'FrenchNumbers',
            ],
            locales,
        ),
        createGallery(
            'Visualizations',
            Object.fromEntries(
                locale.map((l) => [
                    localeToString(l),
                    l.gallery.visualizations,
                ]),
            ),
            [
                'Amplitude',
                'PointerTrail',
                'CodeGap',
                'Garden',
                'Letters',
                'Poem',
                'Questions',
                'RainingKitties',
                'RotatingBinary',
                'FontMachine',
                'Pumpkin',
                'Size',
                'FloatingFoods',
                'AnimatedName',
                'WordplayTrace',
                'Colors',
            ],
            locales,
        ),
        createGallery(
            'Motion',
            Object.fromEntries(
                locale.map((l) => [localeToString(l), l.gallery.motion]),
            ),
            [
                'Hira',
                'Layers',
                'Chamber',
                'Orbits',
                'Pounce',
                'FootBall',
                'Christmas',
                'Easing',
                'Echo',
                'Laughing',
                'Layouts',
                'Mumble',
                'WildTransforms',
            ],
            locales,
        ),
        createGallery(
            'Music',
            Object.fromEntries(
                locale.map((l) => [localeToString(l), l.gallery.music]),
            ),
            [
                'Instruments',
                'Birthday',
                'Conductor',
                'RowYourBoat',
                'CatScat',
                'Chimes',
                'Fireworks',
                'Lyrics',
                'VirtualPiano',
            ],
            locales,
        ),
        createGallery(
            'AV',
            Object.fromEntries(
                locale.map((l) => [localeToString(l), l.gallery.av]),
            ),
            [
                'Listen',
                'Talk',
                'SpokenWords',
                'RainingLetters',
                'Video',
                'PitchNotes',
                'Hand',
                'Face',
                'FaceTalk',
            ],
            locales,
        ),
        createGallery(
            'Stories',
            Object.fromEntries(
                locale.map((l) => [localeToString(l), l.gallery.stories]),
            ),
            [
                'Pears',
                'Dialog',
                'JapaneseClass',
                'PersonalMap',
                'SlideShow',
                'AdoboRecipe',
            ],
            locales,
        ),
        createGallery(
            'Tools',
            Object.fromEntries(
                locale.map((l) => [localeToString(l), l.gallery.tools]),
            ),
            [
                'Calculator',
                'Clock',
                'Literacy',
                'Timer',
                'Headlines',
                'SentenceLength',
                'StudyModeMeter',
                'Patterns',
                'Chatterbox',
            ],
            locales,
        ),
    ];
}
