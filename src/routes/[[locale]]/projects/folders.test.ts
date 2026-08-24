import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import { describe, expect, test } from 'vitest';

import Project from '@db/projects/Project';
import type { ProjectFolders } from '@db/settings/ProjectFoldersSetting';
import {
    moveDestinations,
    nextDestination,
    nextFolderName,
    resolveFolders,
} from './folders';
import sortProjects from '@db/projects/sortProjects';

const Languages = ['en'];

function project(name: string, folder: string | null, timestamp: number) {
    return Project.make(
        `project-${name}`,
        name,
        new Source('main', 'a'),
        [],
        DefaultLocale,
        'owner',
        [],
        false,
        undefined,
        true,
        false,
        false,
        null,
        undefined,
        timestamp,
    ).withFolder(folder);
}

const Folders: ProjectFolders = {
    games: { name: 'Games', collapsed: false },
    class: { name: 'Class work', collapsed: true },
};

describe('sortProjects', () => {
    test('orders by name', () => {
        const sorted = sortProjects(
            [project('cat', null, 1), project('ant', null, 2)],
            'name',
            Languages,
        );
        expect(sorted.map((p) => p.getName())).toEqual(['ant', 'cat']);
    });

    test('orders by most recently edited', () => {
        const sorted = sortProjects(
            [project('ant', null, 1), project('cat', null, 2)],
            'edited',
            Languages,
        );
        expect(sorted.map((p) => p.getName())).toEqual(['cat', 'ant']);
    });

    test('breaks ties by name, so the order is stable', () => {
        // Two projects saved in the same millisecond would otherwise swap
        // places between renders, depending on what order the database
        // happened to hand them over.
        const sorted = sortProjects(
            [project('cat', null, 5), project('ant', null, 5)],
            'edited',
            Languages,
        );
        expect(sorted.map((p) => p.getName())).toEqual(['ant', 'cat']);
    });

    test('does not mutate the list it was given', () => {
        const projects = [project('cat', null, 1), project('ant', null, 2)];
        sortProjects(projects, 'name', Languages);
        expect(projects.map((p) => p.getName())).toEqual(['cat', 'ant']);
    });
});

describe('resolveFolders', () => {
    test('files each project under its folder', () => {
        const { folders, loose } = resolveFolders(
            [
                project('a', 'games', 1),
                project('b', 'class', 1),
                project('c', null, 1),
            ],
            Folders,
            'name',
            Languages,
        );
        expect(folders.map((f) => f.name)).toEqual(['Class work', 'Games']);
        expect(
            folders
                .find((f) => f.id === 'games')
                ?.projects.map((p) => p.getName()),
        ).toEqual(['a']);
        expect(loose.map((p) => p.getName())).toEqual(['c']);
    });

    test('a project whose folder no longer exists falls to the top level', () => {
        // The project doc and the settings doc holding the folder sync
        // separately and can arrive in either order. Showing the project
        // unfiled is far better than hiding a creator's work until the other
        // half turns up.
        const { folders, loose } = resolveFolders(
            [project('orphan', 'deleted-folder', 1)],
            Folders,
            'name',
            Languages,
        );
        expect(loose.map((p) => p.getName())).toEqual(['orphan']);
        expect(folders.every((f) => f.projects.length === 0)).toBe(true);
    });

    test('an empty folder still appears', () => {
        // A folder exists the moment the creator makes one, before anything is
        // in it — otherwise pressing "new folder" appears to do nothing.
        const { folders } = resolveFolders([], Folders, 'name', Languages);
        expect(folders).toHaveLength(2);
    });

    test('carries each folder its collapsed state', () => {
        const { folders } = resolveFolders([], Folders, 'name', Languages);
        expect(folders.find((f) => f.id === 'class')?.collapsed).toBe(true);
        expect(folders.find((f) => f.id === 'games')?.collapsed).toBe(false);
    });

    test('sorts projects inside folders the same way as the top level', () => {
        const { folders, loose } = resolveFolders(
            [
                project('old', 'games', 1),
                project('new', 'games', 9),
                project('older', null, 0),
                project('newer', null, 5),
            ],
            Folders,
            'edited',
            Languages,
        );
        expect(
            folders
                .find((f) => f.id === 'games')
                ?.projects.map((p) => p.getName()),
        ).toEqual(['new', 'old']);
        expect(loose.map((p) => p.getName())).toEqual(['newer', 'older']);
    });
});

describe('nextFolderName', () => {
    test('uses the base name when it is free', () => {
        expect(nextFolderName({}, 'Folder')).toBe('Folder');
    });

    test('counts up past a name already in use', () => {
        expect(nextFolderName(Folders, 'Games')).toBe('Games 2');
    });

    test('skips a numbered name that is also taken', () => {
        expect(
            nextFolderName(
                {
                    ...Folders,
                    other: { name: 'Games 2', collapsed: false },
                },
                'Games',
            ),
        ).toBe('Games 3');
    });
});

describe('nextDestination', () => {
    const { folders } = resolveFolders([], Folders, 'name', Languages);
    const destinations = moveDestinations(folders);

    test('runs in the order the page draws them: folders, then the top level', () => {
        // The arrows walk this list, so it has to match what someone is
        // looking at — otherwise pressing down on a project below a folder
        // moves it up into that folder.
        expect(destinations).toEqual(['class', 'games', null]);
    });

    test('steps down the page and wraps back to the top', () => {
        expect(
            nextDestination(destinations, 'class', 'ArrowRight', false),
        ).toBe('games');
        expect(
            nextDestination(destinations, 'games', 'ArrowRight', false),
        ).toBe(null);
        expect(nextDestination(destinations, null, 'ArrowRight', false)).toBe(
            'class',
        );
    });

    test('steps back up the page', () => {
        expect(nextDestination(destinations, null, 'ArrowLeft', false)).toBe(
            'games',
        );
        expect(nextDestination(destinations, 'class', 'ArrowLeft', false)).toBe(
            null,
        );
    });

    test('a destination that vanished mid-move steps to the first one', () => {
        expect(
            nextDestination(destinations, 'deleted', 'ArrowRight', false),
        ).toBe('class');
    });
});
