import type { SerializedProject } from '../models/Project';
import WhatWord from './WhatWord.wp?raw';
import Kitties from './RainingKitties.wp?raw';
import Pounce from './Pounce.wp?raw';
import Hira from './Hira.wp?raw';
import Video from './Video.wp?raw';
import RainingLetters from './RainingLetters.wp?raw';
import Poem from './Poem.wp?raw';
import Questions from './Questions.wp?raw';
import Maze from './Maze.wp?raw';
import Adventure from './Adventure.wp?raw';
import Letters from './Letters.wp?raw';
import Catch from './Catch.wp?raw';
import Headlines from './Headlines.wp?raw';
import Layers from './Layers.wp?raw';
import { parseNames } from '../parser/parseBind';
import { toTokens } from '../parser/toTokens';
import Gallery from '../models/Gallery';

export function wpToSerializedProject(project: string): SerializedProject {
    const lines = project.split('\n');
    const rest = project.substring(lines.slice(0, 2).join().length + 1);

    // The first line is the project name
    const name = lines[0].trim();
    const gallery = lines[1].trim();

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
        id: name,
        sources: sources,
        locales: languages.size === 0 ? ['en-US'] : Array.from(languages),
        owner: null,
        collaborators: [],
        public: true,
        listed: true,
        archived: false,
        timestamp: Date.now(),
        gallery: gallery.length === 0 ? null : gallery,
    };
}

export function wpToSerializedProjects(raw: string[]) {
    const examples = new Map<string, SerializedProject>();
    for (const example of raw) {
        const serialized = wpToSerializedProject(example);
        examples.set(serialized.id, serialized);
    }
    return examples;
}

export const examples = wpToSerializedProjects([
    Adventure,
    WhatWord,
    Kitties,
    Pounce,
    Hira,
    Video,
    RainingLetters,
    Poem,
    Questions,
    Letters,
    Maze,
    Catch,
    Headlines,
    Layers,
]);

function createGallery(name: string, description: string) {
    return new Gallery({
        id: name,
        path: name,
        name: { 'en-US': name },
        description: { 'en-US': description },
        words: [],
        projects: Array.from(examples.values())
            .filter((example) => example.gallery === name)
            .map((project) => project.id),
        curators: [],
        creators: [],
        public: true,
        featured: true,
    });
}

export const ExampleGalleries: Gallery[] = [
    createGallery('Games', 'Simple interactive games that play with words.'),
    createGallery('Visualizations', 'Visualizations that celebrate language.'),
    createGallery('Physics', 'Demonstrations of physics'),
];
