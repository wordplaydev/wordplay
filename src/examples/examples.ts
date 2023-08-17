import Project from '../models/Project';
import Source from '@nodes/Source';
import WhatWord from './WhatWord.wp?raw';
import Listen from './Listen.wp?raw';
import Talk from './Talk.wp?raw';
import Laughing from './Laughing.wp?raw';
import Layouts from './Layouts.wp?raw';
import Transforms from './WildTransforms.wp?raw';
import Kitties from './RainingKitties.wp?raw';
import Transitions from './Mumble.wp?raw';
import Move from './Move.wp?raw';
import Colors from './Colors.wp?raw';
import TextTransitions from './TextTransitions.wp?raw';
import Physics from './Physics.wp?raw';
import Video from './Video.wp?raw';
import RainingLetters from './RainingLetters.wp?raw';
import Timer from './Timer.wp?raw';
import Poem from './Poem.wp?raw';
import Garden from './Garden.wp?raw';
import Cannon from './Cannon.wp?raw';
import Between from './Between.wp?raw';
import Maze from './Maze.wp?raw';
import Adventure from './Adventure.wp?raw';
import Letters from './Letters.wp?raw';
import RotatingBinary from './RotatingBinary.wp?raw';
import Greeting from './Greeting.wp?raw';
import Catch from './Catch.wp?raw';
import Amplitude from './Amplitude.wp?raw';
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

function wpToStuff(text: string): Stuff {
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
    Listen,
    Talk,
    Laughing,
    Layouts,
    Transforms,
    Kitties,
    Transitions,
    Move,
    Colors,
    TextTransitions,
    Physics,
    Video,
    RainingLetters,
    Timer,
    Poem,
    Garden,
    Cannon,
    Between,
    Maze,
    Letters,
    RotatingBinary,
    Catch,
    Greeting,
    Amplitude,
].map((source) => wpToStuff(source));
