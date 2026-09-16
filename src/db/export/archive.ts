import type { Preamble } from '../../examples/preamble';
import { serializeExample } from '../../examples/serializeExample';
import UnicodeString from '@unicode/UnicodeString';
import type { ZipEntry } from '@util/zip';
import type {
    AccountSnapshot,
    CollectionStep,
    Note,
    Related,
    RelatedKit,
} from './AccountSnapshot';
import { archiveFolder, primaryRelationship, slugForName } from './names';

/**
 * Turns everything gathered into the files of an archive (#152).
 *
 * Pure, and importing nothing from Firebase or Svelte, so the shape of a
 * creator's archive is decided somewhere a millisecond-long test can read it.
 * `exportAccount.ts` is the half that knows how to fill a snapshot in.
 */

/**
 * The archive format's own version, so a reader years from now knows what it
 * is holding. Bump it when the *layout* changes — not when a document schema
 * does, since every record file carries its own `v`.
 */
export const ArchiveVersion = 1;

/** What `manifest.json` says. Everything a reader might otherwise have to
 *  parse the README's prose for. */
type Manifest = {
    wordplay: 'account archive';
    version: number;
    exportedAt: string;
    uid: string;
    counts: Record<string, number>;
    /** Collections that could not be read, and why. */
    gaps: AccountSnapshot['gaps'];
    /** Files that could not be written faithfully, and why. */
    notes: Note[];
};

const encoder = new TextEncoder();

/** Pretty-printed, because a creator opening this in a text editor is the whole
 *  point of an archive. */
function json(value: unknown): Uint8Array {
    return encoder.encode(`${JSON.stringify(value, null, 4)}\n`);
}

function text(value: string): Uint8Array {
    return encoder.encode(value);
}

/** Reads a field off a document we are deliberately not parsing. A record is
 *  archived verbatim, so its type is `unknown`; this is how the index gets a
 *  name to show without the archive taking a position on the document's shape. */
function stringField(data: unknown, ...names: string[]): string {
    if (typeof data !== 'object' || data === null) return '';
    for (const name of names) {
        const value = Reflect.get(data, name);
        if (typeof value === 'string') return value;
    }
    return '';
}

function numberField(data: unknown, name: string): number | null {
    if (typeof data !== 'object' || data === null) return null;
    const value = Reflect.get(data, name);
    return typeof value === 'number' ? value : null;
}

/** One line of a collection's `index.json`: enough to find a file and know what
 *  it is, without opening it. */
type IndexEntry = {
    id: string;
    files: string[];
    name: string;
    relationships: string[];
    updated: number | null;
};

/**
 * A project's sources, as `serializeExample` wants them, or undefined when the
 * document isn't shaped like one.
 *
 * Read off the stored record rather than through `Project.deserialize`, which
 * needs a locales database and would drag the whole language runtime onto this
 * module's import graph for something that is three field reads.
 */
function sourcesOf(
    data: unknown,
): { names: string; code: string }[] | undefined {
    if (typeof data !== 'object' || data === null) return undefined;
    const sources = Reflect.get(data, 'sources');
    if (!Array.isArray(sources)) return undefined;
    const read = sources.map((source) => {
        const names = stringField(source, 'names');
        if (typeof source !== 'object' || source === null) return undefined;
        const code = Reflect.get(source, 'code');
        return typeof code === 'string' ? { names, code } : undefined;
    });
    return read.every((source) => source !== undefined) ? read : undefined;
}

/**
 * What the file has to declare for the project to come back as itself (#152).
 *
 * The locales are declared rather than left to the tags on source names: a
 * project may declare a locale whose text failed to load, and deriving would
 * lose it. The preview mode is here because a pinned glyph that came back as
 * computed would be overwritten on the first render.
 */
function preambleOf(data: unknown): Preamble {
    const preamble: Preamble = {};
    if (typeof data === 'object' && data !== null) {
        const locales = Reflect.get(data, 'locales');
        if (
            Array.isArray(locales) &&
            locales.every((l) => typeof l === 'string') &&
            locales.length > 0
        )
            preamble.locales = locales;
        const preview = Reflect.get(data, 'preview');
        if (stringField(preview, 'mode') === 'manual')
            preamble.preview = 'manual';
    }
    return preamble;
}

/** The preview glyph a `.wp` file opens with, when the project has one. */
function previewGlyphOf(data: unknown): string | undefined {
    if (typeof data !== 'object' || data === null) return undefined;
    const preview = Reflect.get(data, 'preview');
    const glyph = stringField(preview, 'text');
    return glyph.length === 0 ? undefined : glyph;
}

/**
 * Whether a `.wp` file will read back as what it was written from.
 *
 * Both hazards are named by `serializeExample`'s own documentation, and both
 * belong to the *file format* rather than to anything a creator did wrong: a
 * line beginning with the source separator would split the file there, and a
 * one-grapheme name with no glyph above it would be read as the glyph. Neither
 * is fatal here — the lossless `.json` sits beside every `.wp` — but a silent
 * loss would be, so each is recorded in the manifest.
 */
function notesFor(
    file: string,
    name: string,
    glyph: string | undefined,
    sources: { names: string; code: string }[],
): Note[] {
    const notes: Note[] = [];
    if (sources.some((source) => /^=== /m.test(source.code)))
        notes.push({ file, reason: 'header-line' });
    if (glyph === undefined && new UnicodeString(name).getLength() === 1)
        notes.push({ file, reason: 'single-grapheme-name' });
    return notes;
}

/** Where one document's files go. The path names a single relationship — the
 *  folder a creator would look in first — while the index beside it carries
 *  every one that is true. */
function folderFor(collection: string, item: Related): string {
    return `${collection}/${primaryRelationship(item.relationships)}`;
}

/** Builds one collection's folder: a record file per document, an index over
 *  them, and for projects a readable `.wp` alongside. */
function collectionEntries(
    collection: CollectionStep,
    items: Related[],
    nameFields: string[],
    wordplay: boolean,
): { entries: ZipEntry[]; index: IndexEntry[]; notes: Note[] } {
    const entries: ZipEntry[] = [];
    const index: IndexEntry[] = [];
    const notes: Note[] = [];

    for (const item of items) {
        const name = stringField(item.data, ...nameFields);
        const slug = slugForName(name, item.id);
        const folder = folderFor(collection, item);
        const record = `${folder}/${slug}.json`;
        const files = [record];

        // Verbatim, never re-serialized from a parse: an archive is only worth
        // having if it is what the server actually holds, and a parse would
        // quietly drop any field its schema has not heard of yet.
        entries.push({ path: record, bytes: json(item.data) });

        const sources = wordplay ? sourcesOf(item.data) : undefined;
        if (sources !== undefined) {
            const glyph = previewGlyphOf(item.data);
            const file = `${folder}/${slug}.wp`;
            entries.push({
                path: file,
                bytes: text(
                    serializeExample(
                        glyph,
                        name,
                        sources,
                        preambleOf(item.data),
                    ),
                ),
            });
            files.push(file);
            notes.push(...notesFor(file, name, glyph, sources));
        }

        index.push({
            id: item.id,
            files,
            name,
            relationships: item.relationships,
            updated: numberField(item.data, 'timestamp'),
        });
    }

    if (items.length > 0)
        entries.push({ path: `${collection}/index.json`, bytes: json(index) });

    return { entries, index, notes };
}

/** A kit's folder: the registry document, then each published version with its
 *  source beside it. Versions are their own files because a version is
 *  immutable and a whole program — the thing someone borrowing the kit ran. */
function kitEntries(kits: RelatedKit[]): {
    entries: ZipEntry[];
    index: IndexEntry[];
} {
    const entries: ZipEntry[] = [];
    const index: IndexEntry[] = [];

    for (const { kit, versions } of kits) {
        const name = stringField(kit.data, 'name');
        const folder = `kits/${slugForName(name, kit.id)}`;
        const files = [`${folder}/kit.json`];
        entries.push({ path: `${folder}/kit.json`, bytes: json(kit.data) });

        for (const version of versions) {
            const number = numberField(version.data, 'version');
            const stem = number === null ? version.id : `${number}`;
            entries.push({
                path: `${folder}/${stem}.json`,
                bytes: json(version.data),
            });
            files.push(`${folder}/${stem}.json`);
            const code = stringField(version.data, 'code');
            if (code.length > 0) {
                entries.push({
                    path: `${folder}/${stem}.wp`,
                    bytes: text(code),
                });
                files.push(`${folder}/${stem}.wp`);
            }
        }

        index.push({
            id: kit.id,
            files,
            name,
            relationships: kit.relationships,
            updated: numberField(kit.data, 'timestamp'),
        });
    }

    if (kits.length > 0)
        entries.push({ path: 'kits/index.json', bytes: json(index) });

    return { entries, index };
}

/** The self-documents, each written only when the creator has one. A creator
 *  who has never been found to break a rule has no strikes document, and an
 *  empty file would say something untrue about that. */
function selfEntries(snapshot: AccountSnapshot): ZipEntry[] {
    return Object.entries(snapshot.self)
        .filter(([, value]) => value !== undefined)
        .map(([name, value]) => ({
            path: `self/${name}.json`,
            bytes: json(value),
        }));
}

/** This device's own state, which exists nowhere else. */
function deviceEntries(snapshot: AccountSnapshot): ZipEntry[] {
    const { settings, localizationEdits, storage, unsaved } = snapshot.device;
    const entries: ZipEntry[] = [
        { path: 'device/settings.json', bytes: json(settings) },
        { path: 'device/local-storage.json', bytes: json(storage) },
    ];
    if (localizationEdits.length > 0)
        entries.push({
            path: 'device/localization-edits.json',
            bytes: json(localizationEdits),
        });
    if (unsaved.length > 0)
        entries.push({ path: 'device/unsaved.json', bytes: json(unsaved) });
    return entries;
}

/**
 * Every file of the archive, under one folder so unzipping never scatters
 * across a Downloads folder.
 *
 * Entries come back sorted by path, which is what makes two exports of
 * unchanged state byte-identical — so a creator can tell whether anything
 * actually changed between two archives, and so this module's tests are stable.
 */
export function buildArchive(
    snapshot: AccountSnapshot,
    readme: string,
): ZipEntry[] {
    const collections = [
        collectionEntries('projects', snapshot.projects, ['name'], true),
        collectionEntries('galleries', snapshot.galleries, ['name'], false),
        collectionEntries('characters', snapshot.characters, ['name'], false),
        collectionEntries('howtos', snapshot.howTos, ['title', 'name'], false),
        collectionEntries('chats', snapshot.chats, ['name'], false),
        collectionEntries('classes', snapshot.classes, ['name'], false),
        collectionEntries('feedback', snapshot.feedback, ['title'], false),
    ];
    const kits = kitEntries(snapshot.kits);

    const notes = collections.flatMap((collection) => collection.notes);
    const manifest: Manifest = {
        wordplay: 'account archive',
        version: ArchiveVersion,
        exportedAt: snapshot.exportedAt,
        uid: snapshot.account.uid,
        counts: {
            projects: snapshot.projects.length,
            galleries: snapshot.galleries.length,
            characters: snapshot.characters.length,
            howtos: snapshot.howTos.length,
            chats: snapshot.chats.length,
            classes: snapshot.classes.length,
            feedback: snapshot.feedback.length,
            kits: snapshot.kits.length,
        },
        gaps: snapshot.gaps,
        notes,
    };

    const entries: ZipEntry[] = [
        { path: 'README.txt', bytes: text(readme) },
        { path: 'manifest.json', bytes: json(manifest) },
        { path: 'account.json', bytes: json(snapshot.account) },
        ...selfEntries(snapshot),
        ...collections.flatMap((collection) => collection.entries),
        ...kits.entries,
        ...deviceEntries(snapshot),
    ];

    const folder = archiveFolder(
        snapshot.account.username,
        snapshot.exportedAt,
    );
    const modified = new Date(snapshot.exportedAt);
    return entries
        .map((entry) => ({
            path: `${folder}/${entry.path}`,
            bytes: entry.bytes,
            modified,
        }))
        .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}
