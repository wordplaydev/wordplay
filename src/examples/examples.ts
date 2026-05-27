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
        locales: languages.size === 0 ? ['en-US'] : Array.from(languages),
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
        preview,
        stamps: { lamport: 0, fields: {} },
        crdt: null,
    };
}

/** Asynchronously fetch the example */
export async function getExample(
    id: string,
): Promise<SerializedProject | undefined> {
    try {
        const text = await (
            await fetch(`/examples/${id.split('-')[1]}.wp`)
        ).text();
        return parseSerializedProject(text, id);
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
                'Adventure',
                'BasketballStar',
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
                'AditiAnimatedName',
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
                'Pounce',
                'FootBall',
                'Christmas',
                'Easing',
                'Lyrics',
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
                'ASCII',
                'Hand',
            ],
            locales,
        ),
        createGallery(
            'Stories',
            Object.fromEntries(
                locale.map((l) => [localeToString(l), l.gallery.stories]),
            ),
            ['Pears', 'JapaneseClass', 'AditiPersonalMap'],
            locales,
        ),
        createGallery(
            'Tools',
            Object.fromEntries(
                locale.map((l) => [localeToString(l), l.gallery.tools]),
            ),
            ['Calculator', 'Literacy', 'Timer', 'Headlines', 'SentenceLength'],
            locales,
        ),
    ];
}
