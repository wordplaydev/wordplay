import type { SerializedProject } from '../models/Project';
import { parseNames } from '../parser/parseBind';
import { toTokens } from '../parser/toTokens';
import Gallery from '../models/Gallery';
import { moderatedFlags } from '../models/Moderation';

/** This mirrors the static path to examples, but also helps distinguish project IDs from example project names. */
export const ExamplePrefix = 'example-';

export function parseSerializedProject(
    project: string,
    id: string
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
        name,
        id,
        sources: sources,
        locales: languages.size === 0 ? ['en-US'] : Array.from(languages),
        owner: null,
        collaborators: [],
        public: true,
        listed: true,
        archived: false,
        timestamp: Date.now(),
        gallery: null,
        flags: moderatedFlags(),
    };
}

/** Asynchronously fetch the example */
export async function getExample(
    id: string
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

function createGallery(name: string, description: string, projects: string[]) {
    return new Gallery({
        id: name,
        path: name,
        name: { 'en-US': name },
        description: { 'en-US': description },
        words: [],
        projects: projects.map((name) => ExamplePrefix + name),
        curators: [],
        creators: [],
        public: true,
        featured: true,
    });
}

export const ExampleGalleries: Gallery[] = [
    createGallery('Games', 'Simple interactive games that play with words.', [
        'Adventure',
        'Maze',
        'WhatWord',
        'Catch',
    ]),
    createGallery('Visualizations', 'Visualizations that celebrate language.', [
        'Amplitude',
        'Garden',
        'Letters',
        'Poem',
        'Questions',
        'RainingKitties',
        'RotatingBinary',
    ]),
    createGallery('Physics', 'Demonstrations of physics.', [
        'Hira',
        'Layers',
        'Pounce',
    ]),
    createGallery('Sound', 'Demonstrations of audio and video input.', [
        'Listen',
        'Talk',
        'RainingLetters',
        'Video',
    ]),
    createGallery('Tools', 'Simple utilities.', ['Timer', 'Headlines']),
];
