import type { SerializedKit, SerializedKitVersion } from './Kit';
import { kitVersionID } from './Kit';
import kitKinds from './kitKinds';
import { kitDescription } from './kitPreview';
import { exportName } from './validateKit';
import { kitExports } from '@nodes/publishedShare';
import { moderatedFlags } from '@db/projects/Moderation';
import Project from '@db/projects/Project';
import type { SerializedPreviewContent } from '@db/projects/ProjectSchemas';
import type Locales from '@locale/Locales';
import Source from '@nodes/Source';
import { parseBuiltinKitSource } from './kitSourceFile';

import alphabets1 from './sources/alphabets/1.wp?raw';
import instruments1 from './sources/instruments/1.wp?raw';
import tunes1 from './sources/tunes/1.wp?raw';

/**
 * The kits Wordplay ships with (#8), built the way `getExampleGalleries` builds the seven
 * example galleries rather than seeded into Firestore: everything this project ships is a
 * file registered by a literal in `src/`, verified by CI and pushed by a deploy.
 *
 * Their sources are imported rather than fetched, because a kit that fails to load makes
 * someone's *own* project report `UnknownKit` — so a borrow must not depend on a network
 * round-trip, on IndexedDB, or on the `**` → `200.html` rewrite `fetchExampleFile` guards.
 */

/**
 * The owner every built-in kit answers to.
 *
 * A sentinel rather than a uid: nothing in resolution checks that a kit's owner matches
 * the `@name` before the `/` (see `firestore.rules`, which says the same of characters),
 * so this never has to be an account. Reserving the username in production is a separate,
 * manual step that stops a creator publishing under it and confusing readers.
 */
const BuiltinKitOwner = 'wordplay';

/** A built-in kit: its id, its bare name, and the source of each published version. */
type BuiltinKit = {
    /** Stable and permanent — it is what `Project.kit` and a borrow's cache key record. */
    id: string;
    /** The bare name, which becomes `wordplay/<name>`. */
    name: string;
    /** One source per published version, oldest first, so index 0 is version 1. */
    versions: string[];
};

/**
 * Every built-in kit, and every version of each.
 *
 * A version's source is **never edited or removed** once shipped: `↓ @wordplay/tunes 1`
 * has to keep meaning what it meant, which is the immutability promise `LANGUAGE.md`
 * makes about every other kit. An improvement is a new entry in `versions`, not a change
 * to an old one.
 */
export const BuiltinKits: readonly BuiltinKit[] = [
    {
        id: '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
        name: 'alphabets',
        versions: [alphabets1],
    },
    {
        id: '1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e',
        name: 'instruments',
        versions: [instruments1],
    },
    {
        id: '2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e6f',
        name: 'tunes',
        versions: [tunes1],
    },
];

/** A built-in's preview: its glyph line, drawn in the reader's own theme. */
function previewOf(text: string): SerializedPreviewContent {
    return {
        text,
        foreground: null,
        background: null,
        face: null,
        characterName: null,
    };
}

/** The full `username/name` a borrow writes after `@`. */
export function builtinKitName(kit: BuiltinKit): string {
    return `${BuiltinKitOwner}/${kit.name}`;
}

/** A parsed built-in version, with the source in hand. */
type BuiltinKitVersion = {
    kit: SerializedKit;
    version: SerializedKitVersion;
};

/**
 * Everything about a built-in that does not depend on who is reading: the parse, the
 * exports, and the languages those exports carry.
 *
 * Module scope because none of it can change — a shipped version's file is never edited —
 * and because `seedBuiltins` re-runs on every locale change, where re-tokenizing 236 KB of
 * Wordplay to arrive at the same answer is pure waste.
 */
export const ParsedKits = BuiltinKits.map((builtin) => ({
    builtin,
    name: builtinKitName(builtin),
    versions: builtin.versions.map((text) => {
        const { glyph, names, code } = parseBuiltinKitSource(text);
        const source = new Source(names, code);
        const shares = kitExports(source);
        const languages = new Set<string>();
        for (const shared of shares)
            if ('names' in shared)
                for (const name of shared.names.names)
                    for (const language of name.getLanguages())
                        languages.add(language);
        return {
            glyph,
            names,
            code,
            source,
            exports: shares.map(exportName),
            // The languages this version's exports can be read in, derived rather than
            // declared. Not the source's every language tag: a kit may tag its *data*
            // with the language that data is — the Greek alphabet is tagged `/el` — and
            // that says nothing about who can read the kit.
            localesOfExports: [...languages].sort(),
        };
    }),
}));

/**
 * Every built-in kit, as the registry entries and versions the rest of the app already
 * knows how to render.
 *
 * Derived rather than restated, so a built-in kit and a creator's kit are described by the
 * same code: the description is the first sentence of the source's own doc, the exports
 * are its `↑` shares, and the kinds are the types those shares carry. Only `description`
 * and `kinds` depend on the locale; everything else comes from {@link ParsedKits}.
 */
export function getBuiltinKits(locales: Locales): BuiltinKitVersion[] {
    const built: BuiltinKitVersion[] = [];
    for (const { builtin, name, versions } of ParsedKits) {
        const latest = versions.length;
        // The newest version is what the registry describes, the way a creator's kit
        // takes its description and exports from the version they just published.
        const newest = versions[latest - 1];
        if (newest === undefined) continue;
        const project = Project.make(
            null,
            builtin.name,
            newest.source,
            [],
            locales.getLocales(),
        );
        const kit: SerializedKit = {
            v: 1,
            id: builtin.id,
            owner: BuiltinKitOwner,
            name,
            aliases: [],
            collaborators: [],
            description: kitDescription(newest.source, locales),
            latest,
            versionCount: latest,
            public: true,
            // Shipping through git is the moderation decision, exactly as it is for the
            // example galleries — `createGallery` says the same of theirs.
            moderation: 'approved',
            moderatedAt: null,
            // Listed at its newest version, since shipping through git approved that one.
            listed: true,
            listedVersion: latest,
            flags: moderatedFlags(),
            // Empty on purpose, like an example gallery's: a built-in is searched in full
            // locally rather than through the server-side prefilter `words` exists for.
            words: [],
            exports: newest.exports,
            kinds: kitKinds(newest.source, project.getContext(newest.source)),
            ...(newest.glyph === undefined
                ? {}
                : { preview: previewOf(newest.glyph) }),
            // Oldest in the registry's `updated` order, so a built-in never displaces
            // someone's newly published kit from the top of the list.
            updated: 0,
            originProject: null,
        };
        for (const [index, one] of versions.entries())
            built.push({
                kit,
                version: {
                    v: 1,
                    id: kitVersionID(builtin.id, index + 1),
                    kit: builtin.id,
                    version: index + 1,
                    owner: BuiltinKitOwner,
                    name,
                    public: true,
                    sourceName: one.names,
                    code: one.code,
                    locales: one.localesOfExports,
                    exports: one.exports,
                    ...(one.glyph === undefined
                        ? {}
                        : { preview: previewOf(one.glyph) }),
                    created: 0,
                },
            });
    }
    return built;
}
