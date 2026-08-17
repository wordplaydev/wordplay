import Project from '@db/projects/Project';
import type { SerializedProject } from '@db/projects/ProjectSchemas';
import DefaultLocale from '@locale/DefaultLocale';
import { Locales } from '@db/Database';
import Source from '@nodes/Source';
import { expect, test } from 'vitest';
import { readProjects } from '../../examples/readProjects';
import projectReplaysMusic from './replayBinding';

function replays(code: string): boolean {
    return projectReplaysMusic(
        Project.make(null, 'test', new Source('main', code), [], DefaultLocale),
    );
}

test('a music with no replay needs no catching up', () => {
    expect(replays('Music(Track([1]))')).toBe(false);
});

test('a project with no music at all needs none either', () => {
    expect(replays("Phrase('hi')")).toBe(false);
});

test('a named replay counts', () => {
    expect(replays('Music(Track([1]) replay: ⊤)')).toBe(true);
});

// The gate reads inputs by position as well as by name, since both spellings
// are the same binding to the evaluator.
test('a positional replay counts', () => {
    expect(
        replays('Music(Track([1]) 120beats/min 0semitones Music.major 100% ⊤)'),
    ).toBe(true);
});

test('the emoji spelling counts', () => {
    expect(replays('🎼(🎶([1]) replay: ⊤)')).toBe(true);
});

// Reading references rather than evaluating is what finds this: the call is
// what supplies the flag, and the music itself is built somewhere else entirely.
test('a replay inside a function counts, called or not', () => {
    expect(replays('ƒ ding(go•?) Music(Track([1]) replay: go)')).toBe(true);
});

// The gate decides whether a project pays for catch-up at all, so a wrong
// answer on a shipped example is either a silent sound effect or a cost paid
// by every frame of a project that could never need it.
const examples = new Map(
    readProjects('examples').map(
        (project: SerializedProject) => [project.id, project] as const,
    ),
);

async function replaysExample(name: string): Promise<boolean> {
    const serialized = examples.get(name);
    if (serialized === undefined) throw new Error(`no example named ${name}`);
    return projectReplaysMusic(await Project.deserialize(Locales, serialized));
}

test.each([['Chimes'], ['HummingBird'], ['BuildingBlocks']])(
    '%s uses replay, so it catches up',
    async (name) => {
        expect(await replaysExample(name)).toBe(true);
    },
);

test.each([['Lyrics'], ['Fireworks'], ['FootBall'], ['Instruments']])(
    '%s makes music without replay, so it pays nothing',
    async (name) => {
        expect(await replaysExample(name)).toBe(false);
    },
);
