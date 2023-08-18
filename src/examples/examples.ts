import Project from '../models/Project';
import Source from '@nodes/Source';
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
import { parseNames } from '../parser/parseBind';
import type Names from '../nodes/Names';
import { database } from '../db/Database';
import { getBestSupportedLocales } from '../locale/Locale';
import { toTokens } from '../parser/toTokens';

export type Stuff = {
    name: string;
    sources: { names: Names; code: string }[];
    locales: string[];
};

export async function makeProject(stuff: Stuff) {
    const locales = await database.loadLocales(
        getBestSupportedLocales(stuff.locales)
    );

    return new Project(
        stuff.name,
        stuff.name,
        new Source(stuff.sources[0].names, stuff.sources[0].code),
        stuff.sources.slice(1).map((s) => new Source(s.names, s.code)),
        locales
    );
}

export function wpToStuff(text: string): Stuff {
    // Split the file by "===" lines
    const files = text.split(/(?==== .*\n)/g);

    // Split the files by header and code
    const sources = files.map((file) => {
        const EOL = file.indexOf('\n') + 1;
        const header = file.substring(0, EOL);
        const name = header.replace('===', '').trim();
        const code = file.substring(EOL);
        return { names: parseNames(toTokens(name)), code: code };
    });

    // Find all of the languages referenced
    const languages = Array.from(
        new Set(sources.map((source) => source.names.getLanguages()).flat())
    );

    // Return stuff for display
    return {
        name: sources[0].names.getNames()[0],
        sources: sources,
        locales: languages.length === 0 ? ['en-US'] : languages,
    };
}

export const examples: Stuff[] = [
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
].map((source) => wpToStuff(source));
