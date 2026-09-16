import { parseSerializedProject } from '../../examples/examples';
import { describe, expect, test } from 'vitest';
import { ProjectSchema } from '../projects/ProjectSchemas';
import type { AccountSnapshot, Related } from './AccountSnapshot';
import { ArchiveVersion, buildArchive } from './archive';

const decoder = new TextDecoder();

function emptySnapshot(): AccountSnapshot {
    return {
        exportedAt: '2026-09-15T12:00:00.000Z',
        account: {
            uid: 'u1',
            username: 'amy',
            character: '😀',
            usesUsername: true,
            emailVerified: false,
            providers: ['password'],
            created: '2026-01-01T00:00:00.000Z',
            lastSignIn: '2026-09-15T00:00:00.000Z',
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
            settings: [{ key: 'dark', device: true, value: null }],
            localizationEdits: [],
            storage: {},
            unsaved: [],
        },
        gaps: [],
    };
}

/** A project document shaped like the one Firestore actually stores, so the
 *  "written verbatim" claim is tested against a real schema rather than a stub. */
function project(
    id: string,
    name: string,
    code: string,
    extra: Record<string, unknown> = {},
): Related {
    return {
        id,
        data: {
            v: 12,
            id,
            name,
            sources: [{ names: 'start', code, caret: 0 }],
            dependencies: [],
            locales: ['en-US'],
            owner: 'u1',
            collaborators: [],
            commenters: [],
            viewers: [],
            listed: false,
            public: false,
            archived: false,
            persisted: true,
            timestamp: 1000,
            gallery: null,
            restrictedGallery: false,
            flags: {
                dehumanization: false,
                violence: false,
                disclosure: false,
                misinformation: false,
            },
            nonPII: [],
            chat: null,
            history: [],
            stamps: { lamport: 0, fields: {} },
            crdt: null,
            remixOf: null,
            folder: null,
            researchConsent: false,
            kit: null,
            kitSource: 0,
            preview: {
                mode: 'auto',
                text: '🐈',
                foreground: null,
                background: null,
                face: null,
                characterName: null,
            },
            ...extra,
        },
        relationships: ['owner'],
    };
}

/** Every path in the archive, with the archive's own folder stripped. */
function paths(entries: { path: string }[]): string[] {
    return entries.map((entry) => entry.path.replace(/^[^/]+\//, ''));
}

function fileAt(
    entries: { path: string; bytes: Uint8Array }[],
    path: string,
): string {
    const entry = entries.find((e) => e.path.endsWith(`/${path}`));
    expect(
        entry,
        `expected ${path} in ${paths(entries).join(', ')}`,
    ).toBeDefined();
    return decoder.decode(entry?.bytes);
}

describe('buildArchive', () => {
    test('puts every file under one folder named for the creator and day', () => {
        const entries = buildArchive(emptySnapshot(), 'readme');
        expect(
            entries.every((entry) =>
                entry.path.startsWith('wordplay-amy-2026-09-15/'),
            ),
        ).toBe(true);
    });

    test('always writes the three files that explain the archive', () => {
        expect(paths(buildArchive(emptySnapshot(), 'readme'))).toEqual(
            expect.arrayContaining([
                'README.txt',
                'manifest.json',
                'account.json',
            ]),
        );
    });

    test('writes a record and a readable source for a project', () => {
        const snapshot = emptySnapshot();
        snapshot.projects = [project('a1b2c3d4e5', 'cat', '1 + 1\n')];
        const entries = buildArchive(snapshot, 'readme');
        expect(paths(entries)).toEqual(
            expect.arrayContaining([
                'projects/owner/cat-a1b2c3d4.json',
                'projects/owner/cat-a1b2c3d4.wp',
                'projects/index.json',
            ]),
        );
    });

    test('writes the stored record verbatim', () => {
        // The whole value of an archive is that it is what the server holds. A
        // re-serialization from a parse would quietly drop any field the schema
        // has not heard of yet, and add any default it invents.
        const snapshot = emptySnapshot();
        const item = project('a1b2c3d4e5', 'cat', '1 + 1\n', {
            aFieldFromTheFuture: 42,
        });
        snapshot.projects = [item];
        const entries = buildArchive(snapshot, 'readme');
        const written = JSON.parse(
            fileAt(entries, 'projects/owner/cat-a1b2c3d4.json'),
        );
        expect(written).toEqual(item.data);
        expect(written.aFieldFromTheFuture).toBe(42);
    });

    test('writes a record that still validates against its own schema', () => {
        const snapshot = emptySnapshot();
        snapshot.projects = [project('a1b2c3d4e5', 'cat', '1 + 1\n')];
        const entries = buildArchive(snapshot, 'readme');
        const written = JSON.parse(
            fileAt(entries, 'projects/owner/cat-a1b2c3d4.json'),
        );
        expect(ProjectSchema.safeParse(written).success).toBe(true);
    });

    test('writes a source file Wordplay can read back', () => {
        const snapshot = emptySnapshot();
        snapshot.projects = [project('a1b2c3d4e5', 'cat', '1 + 1\n')];
        const entries = buildArchive(snapshot, 'readme');
        const reread = parseSerializedProject(
            fileAt(entries, 'projects/owner/cat-a1b2c3d4.wp'),
            'a1b2c3d4e5',
        );
        expect(reread.name).toBe('cat');
        expect(reread.sources[0]?.code).toBe('1 + 1\n');
        expect(reread.sources[0]?.names).toBe('start');
        expect(reread.preview?.text).toBe('🐈');
    });

    test('files a document under the strongest relationship it has', () => {
        const snapshot = emptySnapshot();
        const item = project('a1b2c3d4e5', 'cat', '1\n');
        item.relationships = ['viewer', 'collaborator'];
        snapshot.projects = [item];
        expect(paths(buildArchive(snapshot, 'readme'))).toContain(
            'projects/collaborator/cat-a1b2c3d4.json',
        );
    });

    test('carries every relationship in the index, not just the one in the path', () => {
        const snapshot = emptySnapshot();
        const item = project('a1b2c3d4e5', 'cat', '1\n');
        item.relationships = ['owner', 'commenter'];
        snapshot.projects = [item];
        const index = JSON.parse(
            fileAt(buildArchive(snapshot, 'readme'), 'projects/index.json'),
        );
        expect(index[0].relationships).toEqual(['owner', 'commenter']);
        expect(index[0].files).toContain('projects/owner/cat-a1b2c3d4.wp');
    });

    test('records a source file that cannot read back cleanly', () => {
        // A line starting with the source separator would split the file there
        // when read back, so the `.wp` is not faithful — the `.json` beside it
        // is, and the manifest says which.
        const snapshot = emptySnapshot();
        snapshot.projects = [
            project('a1b2c3d4e5', 'cat', '1\n=== not a header\n'),
        ];
        const manifest = JSON.parse(
            fileAt(buildArchive(snapshot, 'readme'), 'manifest.json'),
        );
        expect(manifest.notes).toEqual([
            { file: 'projects/owner/cat-a1b2c3d4.wp', reason: 'header-line' },
        ]);
    });

    test('records a one-grapheme name with no glyph above it', () => {
        // The reader would take that single line as the preview glyph, leaving
        // the project nameless.
        const snapshot = emptySnapshot();
        snapshot.projects = [
            project('a1b2c3d4e5', '🐈', '1\n', { preview: undefined }),
        ];
        const manifest = JSON.parse(
            fileAt(buildArchive(snapshot, 'readme'), 'manifest.json'),
        );
        expect(manifest.notes).toEqual([
            {
                file: 'projects/owner/🐈-a1b2c3d4.wp',
                reason: 'single-grapheme-name',
            },
        ]);
    });

    test('writes no folder for a collection that could not be read', () => {
        // An empty folder would say "you have no galleries", which is a
        // different and false claim.
        const snapshot = emptySnapshot();
        snapshot.gaps = [
            { collection: 'galleries', reason: 'permission-denied' },
        ];
        const entries = buildArchive(snapshot, 'readme');
        expect(paths(entries).some((p) => p.startsWith('galleries/'))).toBe(
            false,
        );
        const manifest = JSON.parse(fileAt(entries, 'manifest.json'));
        expect(manifest.gaps).toEqual([
            { collection: 'galleries', reason: 'permission-denied' },
        ]);
    });

    test('writes a self document only when the creator has one', () => {
        // A creator who has never been found to break a rule has no strikes
        // document at all, and an empty file would say otherwise.
        const bare = buildArchive(emptySnapshot(), 'readme');
        expect(paths(bare).some((p) => p.startsWith('self/'))).toBe(false);

        const snapshot = emptySnapshot();
        snapshot.self = { handle: { v: 1, username: 'amy' } };
        expect(paths(buildArchive(snapshot, 'readme'))).toContain(
            'self/handle.json',
        );
    });

    test('writes a kit with each published version beside its source', () => {
        const snapshot = emptySnapshot();
        snapshot.kits = [
            {
                kit: {
                    id: 'k1234567',
                    data: { v: 1, name: 'colors', owner: 'u1' },
                    relationships: ['owner'],
                },
                versions: [
                    {
                        id: 'k1234567_1',
                        data: { version: 1, code: '↑ red: 1\n' },
                        relationships: ['owner'],
                    },
                ],
            },
        ];
        const entries = buildArchive(snapshot, 'readme');
        expect(paths(entries)).toEqual(
            expect.arrayContaining([
                'kits/colors-k1234567/kit.json',
                'kits/colors-k1234567/1.json',
                'kits/colors-k1234567/1.wp',
                'kits/index.json',
            ]),
        );
        expect(fileAt(entries, 'kits/colors-k1234567/1.wp')).toBe('↑ red: 1\n');
    });

    test('names every file exactly once', () => {
        const snapshot = emptySnapshot();
        // Two projects sharing a name is ordinary, and must not share a file.
        snapshot.projects = [
            project('aaaaaaaa1', 'cat', '1\n'),
            project('bbbbbbbb1', 'cat', '2\n'),
        ];
        const all = buildArchive(snapshot, 'readme').map((e) => e.path);
        expect(new Set(all).size).toBe(all.length);
    });

    test('is byte-identical for unchanged state', () => {
        // So a creator can tell whether anything actually changed between two
        // archives, rather than diffing a reshuffled zip.
        const snapshot = emptySnapshot();
        snapshot.projects = [
            project('bbbbbbbb1', 'dog', '2\n'),
            project('aaaaaaaa1', 'cat', '1\n'),
        ];
        expect(buildArchive(snapshot, 'readme')).toEqual(
            buildArchive(snapshot, 'readme'),
        );
    });

    test('stamps the format version so a later reader knows what it holds', () => {
        const manifest = JSON.parse(
            fileAt(buildArchive(emptySnapshot(), 'readme'), 'manifest.json'),
        );
        expect(manifest.version).toBe(ArchiveVersion);
        expect(manifest.wordplay).toBe('account archive');
    });

    test("always writes this device's settings, since they exist nowhere else", () => {
        expect(paths(buildArchive(emptySnapshot(), 'readme'))).toEqual(
            expect.arrayContaining([
                'device/settings.json',
                'device/local-storage.json',
            ]),
        );
    });
});
