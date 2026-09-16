import DefaultLocale from '@locale/DefaultLocale';
import { describe, expect, test } from 'vitest';
import Project from './Project';
import importProject, {
    MAX_IMPORT_BYTES,
    type ProjectLoader,
} from './importProject';
import { serializeExample } from '../../examples/serializeExample';

/** The real deserialization, minus the kit resolution that needs a database.
 *  Kits are resolved by the caller's loader in the app; what this file is about
 *  is which fields survive. */
const loader: ProjectLoader = {
    async deserialize(serialized: unknown) {
        return Project.deserialize(
            { loadLocales: async () => [DefaultLocale] },
            // The parser's own output is what the app hands this; a guard here
            // rather than a cast, since a fixture agreeing with itself proves
            // nothing.
            isSerialized(serialized) ? serialized : unreachable(),
        );
    },
};

function isSerialized(
    value: unknown,
): value is Parameters<typeof Project.deserialize>[1] {
    return typeof value === 'object' && value !== null && 'sources' in value;
}

function unreachable(): never {
    throw new Error('the parser produced something unserialized');
}

const file = serializeExample('🐈', 'Cat', [
    { names: 'start/en', code: "Phrase('hi')\n" },
]);

describe('importProject', () => {
    test('brings back the four things that are the creator’s', async () => {
        const result = await importProject(file, 'me', loader);
        expect(result.kind).toBe('imported');
        if (result.kind !== 'imported') return;
        const serialized = result.project.serialize();
        expect(serialized.name).toBe('Cat');
        expect(serialized.sources).toHaveLength(1);
        expect(serialized.sources[0]?.code).toBe("Phrase('hi')\n");
        expect(serialized.sources[0]?.names).toBe('start/en');
        // The header says /en; deserialization resolves that to the supported
        // locale it names, which is what the project is actually written in.
        expect(serialized.locales).toEqual(['en-US']);
    });

    test('takes its new owner and a new identity', async () => {
        const result = await importProject(file, 'me', loader);
        if (result.kind !== 'imported') return expect.fail('not imported');
        const serialized = result.project.serialize();
        expect(serialized.owner).toBe('me');
        expect(serialized.id).not.toBe('imported');
        expect(serialized.persisted).toBe(false);
        expect(serialized.collaborators).toEqual([]);
        expect(serialized.viewers).toEqual([]);
        expect(serialized.commenters).toEqual([]);
        expect(serialized.gallery).toBeNull();
        expect(serialized.chat).toBeNull();
    });

    test('never carries a consent nobody gave', async () => {
        // researchConsent is permission to show the work in research. It is the
        // owner's to give, and a file is not a person.
        const result = await importProject(file, 'me', loader);
        if (result.kind !== 'imported') return expect.fail('not imported');
        expect(result.project.serialize().researchConsent).toBe(false);
    });

    test('never claims someone else’s kit or remix', async () => {
        // Keeping `kit` would make this account's next publish push a version
        // of another creator's kit; keeping `remixOf` would grow their remix
        // list from a file passed around offline.
        const result = await importProject(file, 'me', loader);
        if (result.kind !== 'imported') return expect.fail('not imported');
        const serialized = result.project.serialize();
        expect(serialized.kit).toBeNull();
        expect(serialized.remixOf).toBeNull();
    });

    test('arrives unmoderated and unreviewed', async () => {
        // `flags` are a moderator's decision about the original, and `nonPII`
        // is one person's judgment that some text identifies nobody. Neither
        // is inherited: a copy is not pre-cleared or pre-condemned.
        const result = await importProject(file, 'me', loader);
        if (result.kind !== 'imported') return expect.fail('not imported');
        const serialized = result.project.serialize();
        expect(Object.values(serialized.flags).every((f) => f === null)).toBe(
            true,
        );
        expect(serialized.nonPII).toEqual([]);
    });

    test('brings back a declared locale a header could not have said', async () => {
        // The source is tagged /en, but the project declares es-MX first. Only
        // the preamble can carry that.
        const declared = serializeExample(
            '🐈',
            'Cat',
            [{ names: 'start/en', code: '1\n' }],
            { locales: ['es-MX', 'en-US'] },
        );
        const result = await importProject(declared, 'me', loader);
        if (result.kind !== 'imported') return expect.fail('not imported');
        expect(result.project.serialize().locales).toEqual(['es-MX', 'en-US']);
    });

    test('refuses an empty file', async () => {
        expect(await importProject('   \n ', 'me', loader)).toEqual({
            kind: 'failed',
            problem: 'empty',
        });
    });

    test('refuses a file too big to ever save', async () => {
        // Above Firestore's document limit, so importing it would produce a
        // project that could never sync — a worse failure than refusing here.
        const huge = `x\nBig\n=== start\n${'a'.repeat(MAX_IMPORT_BYTES)}`;
        expect(await importProject(huge, 'me', loader)).toEqual({
            kind: 'failed',
            problem: 'too-large',
        });
    });

    test('refuses a file that is not a project, without throwing', async () => {
        const failing: ProjectLoader = {
            async deserialize() {
                throw new Error('not a project');
            },
        };
        expect(await importProject(file, 'me', failing)).toEqual({
            kind: 'failed',
            problem: 'unreadable',
        });
    });

    test('survives a signed-out creator', async () => {
        const result = await importProject(file, null, loader);
        if (result.kind !== 'imported') return expect.fail('not imported');
        expect(result.project.serialize().owner).toBeNull();
    });
});
