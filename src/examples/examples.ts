import { parseNames } from '../parser/parseBind';
import { toTokens } from '../parser/toTokens';
import Gallery, { GallerySchemaLatestVersion } from '@db/galleries/Gallery';
import { moderatedFlags } from '../db/projects/Moderation';
import { localeToString } from '../locale/Locale';
import type { GalleryText } from '../locale/GalleryTexts';
import {
    ProjectSchemaLatestVersion,
    type SerializedProject,
} from '../db/projects/ProjectSchemas';
import Project from '@db/projects/Project';
import type Locales from '@locale/Locales';
import { Locales as LocalesDB } from '@db/Database';

/** This mirrors the static path to examples, but also helps distinguish project IDs from example project names. */
export const ExamplePrefix = 'example-';

export function parseSerializedProject(
    project: string,
    id: string,
): SerializedProject {
    const lines = project.split('\n');
    const rest = project.substring(lines.slice(0, 1).join().length + 1);

    // The first line is the project name
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
        for (const language of parseNames(toTokens(names)).getLanguages())
            languages.add(language);
        return { names, code, caret: 0 };
    });

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

/** File names of template projects */
export const Templates = [
    'blank',
    'phrase',
    'animate',
    'move',
    'scene',
    'mic',
    'video',
];

export async function getTemplates(locales: Locales): Promise<Project[]> {
    const projects = await Promise.all(
        Templates.map((name) => getTemplate(name, locales)),
    );

    return projects.filter((p): p is Project => p !== undefined);
}

/** Function to load template project with particular locales */
export async function getTemplate(
    name: string,
    locales: Locales,
): Promise<Project | undefined> {
    try {
        const text = await (await fetch(`/templates/${name}.wp`)).text();
        const project = parseSerializedProject(text, name);
        return (await Project.deserialize(LocalesDB, project))
            .withLocales(locales.getLocales())
            .withRevisedLocales(locales);
    } catch (error) {
        console.error(error);
        return undefined;
    }
}

function createGallery(
    id: string,
    text: Record<string, GalleryText>,
    projects: string[],
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
            ],
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
            ],
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
        ),
        createGallery(
            'AV',
            Object.fromEntries(
                locale.map((l) => [localeToString(l), l.gallery.av]),
            ),
            ['Listen', 'Talk', 'RainingLetters', 'Video', 'ASCII'],
        ),
        createGallery(
            'Tools',
            Object.fromEntries(
                locale.map((l) => [localeToString(l), l.gallery.tools]),
            ),
            ['Calculator', 'Literacy', 'Timer', 'Headlines', 'SentenceLength'],
        ),
    ];
}
