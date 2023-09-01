import type { SerializedProject } from '../models/Project';
import WhatWord from './WhatWord.wp?raw';
import Kitties from './RainingKitties.wp?raw';
import Move from './Move.wp?raw';
import Physics from './Physics.wp?raw';
import Video from './Video.wp?raw';
import RainingLetters from './RainingLetters.wp?raw';
import Poem from './Poem.wp?raw';
import Cannon from './Cannon.wp?raw';
import Maze from './Maze.wp?raw';
import Adventure from './Adventure.wp?raw';
import Letters from './Letters.wp?raw';
import Catch from './Catch.wp?raw';
import Headlines from './Headlines.wp?raw';
import { parseNames } from '../parser/parseBind';
import { toTokens } from '../parser/toTokens';

export function wpToSerializedProject(project: string): SerializedProject {
    // Get the first line and the rest.
    const firstLine = project.split('\n')[0];

    const rest = project.substring(firstLine.length + 1);

    // The first line is the project name
    const name = firstLine.trim();

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
    Move,
    Physics,
    Video,
    RainingLetters,
    Poem,
    Cannon,
    Letters,
    Maze,
    Catch,
    Headlines,
]);
