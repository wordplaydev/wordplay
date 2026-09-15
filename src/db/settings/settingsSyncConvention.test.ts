import { readFileSync } from 'fs';
import { expect, test } from 'vitest';

/**
 * Every synced setting must be both written by `toObject` and read by
 * `syncUser`, in the same change that adds it.
 *
 * The creator document is overwritten *wholesale* by `uploadSettings`, so a
 * field written but never read comes back and is discarded on the next write of
 * any other setting — and a field read but never written is silently absent.
 * Either way the creator's choice vanishes on a second device with nothing
 * failing. `SettingsSchemaV5`'s own comment warns about this, the folders work
 * hit it, and v6 exists because four settings had been flagged synced while
 * appearing in neither function.
 *
 * Read as text rather than by calling either function: both need a live
 * `Database`, and what is being checked is that a *name appears in both places*,
 * which is exactly what a reviewer would grep for.
 */
const Source = readFileSync('src/db/settings/SettingsDatabase.ts', 'utf8');

/** A field of the current schema is a key on `SettingsSchemaV*`, so collect the
 *  names each version declares. `v` is the version marker, not a setting. */
function schemaFields(): string[] {
    const fields = new Set<string>();
    for (const block of Source.matchAll(
        /export type SettingsSchemaV\d+ =[\s\S]*?\n\};/g,
    ))
        for (const field of block[0].matchAll(/^\s{4}(\w+)\??:/gm)) {
            const name = field[1];
            if (name !== undefined && name !== 'v') fields.add(name);
        }
    return [...fields];
}

function bodyOf(name: string): string {
    const start = Source.indexOf(name);
    expect(start, `${name} not found`).toBeGreaterThan(-1);
    return Source.slice(start, start + 4000);
}

test('every synced setting is both written and read', () => {
    const written = bodyOf('toObject(): SettingsSchema {');
    const read = bodyOf('async syncUser(');
    const missing = schemaFields().filter(
        (field) => !written.includes(field) || !read.includes(field),
    );
    expect(
        missing,
        'these schema fields are not in both toObject and syncUser, so they will not survive a round trip',
    ).toEqual([]);
});

test('the schema version union knows every version', () => {
    // `SettingsSchema` aliases the newest, so the union has to name each older
    // one explicitly — v9 fell out of it the moment v10 was added.
    const versions = [
        ...Source.matchAll(/export type (SettingsSchemaV\d+) =/g),
    ].map((m) => m[1]);
    const union = bodyOf('type SettingsSchemaUnknown =');
    const latest = `SettingsSchemaV${
        Source.match(/const SettingsSchemaLatestVersion = (\d+);/)?.[1] ?? '?'
    }`;
    const absent = versions.filter(
        (v) => v !== latest && v !== undefined && !union.includes(`| ${v}\n`),
    );
    expect(absent).toEqual([]);
});
