import { describe, expect, test } from 'vitest';
import {
    CollectionSteps,
    type AccountSnapshot,
    type CollectionStep,
} from './AccountSnapshot';
import { buildReadme, type ReadmeText } from './readme';

/** A name per collection, built by walking the list rather than by casting a
 *  `fromEntries` — which would let a missing one through. */
function kindNames(): ReadmeText['kinds'] {
    const names: Partial<Record<CollectionStep, string>> = {};
    for (const step of CollectionSteps) names[step] = `the ${step}`;
    const {
        account,
        projects,
        galleries,
        characters,
        howtos,
        chats,
        kits,
        classes,
        feedback,
        device,
    } = names;
    if (
        account === undefined ||
        projects === undefined ||
        galleries === undefined ||
        characters === undefined ||
        howtos === undefined ||
        chats === undefined ||
        kits === undefined ||
        classes === undefined ||
        feedback === undefined ||
        device === undefined
    )
        throw new Error('every collection needs a name');
    return {
        account,
        projects,
        galleries,
        characters,
        howtos,
        chats,
        kits,
        classes,
        feedback,
        device,
    };
}

const text: ReadmeText = {
    title: 'Your Wordplay archive',
    intro: 'Made on 2026-09-15.',
    contents: 'Each folder holds one kind of thing.',
    contentsFiles: 'contentsFiles',
    contentsAccount: 'contentsAccount',
    relationships: 'The folder names say how you are connected.',
    relationshipsWords: 'relationshipsWords',
    device: 'The device folder is only on this computer.',
    formats: 'Open a .wp file by pasting it into a new project.',
    excluded: 'Some things are not here.',
    privacy: 'Chats hold other people words. Nothing here is locked.',
    missing: 'These could not be read:',
    manifest: 'See manifest.json.',
    kinds: kindNames(),
};

function snapshot(gaps: AccountSnapshot['gaps'] = []): AccountSnapshot {
    return {
        exportedAt: '2026-09-15T12:00:00.000Z',
        account: {
            uid: 'u1',
            username: 'amy',
            character: null,
            usesUsername: true,
            emailVerified: false,
            providers: [],
            created: null,
            lastSignIn: null,
            claims: [],
        },
        self: {},
        projects: [],
        galleries: [],
        characters: [],
        howTos: [],
        chats: [],
        classes: [],
        feedback: [],
        kits: [],
        device: {
            settings: [],
            localizationEdits: [],
            storage: {},
            unsaved: [],
        },
        gaps,
    };
}

describe('buildReadme', () => {
    test('says everything a creator needs to make sense of the archive', () => {
        const readme = buildReadme(text, snapshot());
        for (const paragraph of [
            text.title,
            text.intro,
            text.contents,
            text.relationships,
            text.device,
            text.formats,
            text.excluded,
            text.privacy,
            text.manifest,
        ])
            expect(readme).toContain(paragraph);
    });

    test('says nothing about gaps when there are none', () => {
        // A heading with nothing under it reads like a failure.
        expect(buildReadme(text, snapshot())).not.toContain(text.missing);
    });

    test('names what could not be read, in the creator language', () => {
        const readme = buildReadme(
            text,
            snapshot([{ collection: 'galleries', reason: 'offline' }]),
        );
        expect(readme).toContain(text.missing);
        expect(readme).toContain('- the galleries: offline');
    });

    test('separates paragraphs with a blank line and ends with a newline', () => {
        const readme = buildReadme(text, snapshot());
        expect(readme).toMatch(/\n$/);
        expect(readme).toContain(`${text.title}\n\n${text.intro}`);
    });
});
