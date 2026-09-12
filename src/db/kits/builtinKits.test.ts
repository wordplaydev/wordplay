import Templates from '@concepts/Templates';
import { DB } from '@db/Database';
import { KitSchema, KitVersionSchema, MAX_KIT_VERSIONS } from './Kit';
import { MAX_KINDS } from './kitKinds';
import { pickKitPreviewExample } from './kitPreview';
import { checkKit } from './validateKit';
import { resolveKits } from './resolveKits';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import Source from '@nodes/Source';
import { docsFor, kitExports } from '@nodes/publishedShare';
import evaluateCode from '@runtime/evaluate';
import Evaluator from '@runtime/Evaluator';
import ListValue from '@values/ListValue';
import NumberValue from '@values/NumberValue';
import { readdirSync } from 'node:fs';

/** Where the shipped sources live — under `src/`, not `static/`, because they are
 *  imported with Vite's `?raw` rather than fetched, so `static/` would deploy a second
 *  copy nothing ever requests. */
const KitsRoot = 'src/db/kits/sources';
import { describe, expect, test } from 'vitest';
import { BuiltinKits, builtinKitName, getBuiltinKits } from './builtins';
import { parseBuiltinKitSource } from './kitSourceFile';

/**
 * Shipping a built-in kit through git *is* the moderation decision, so the checks a
 * moderator would have made are these tests (#8). A creator's kit is held to
 * `checkKit`'s rules by the publish dialog; nothing would hold ours to them.
 */

const built = getBuiltinKits(DefaultLocales);

/** Every version, with its source parsed, since most checks are about one version. */
const versions = BuiltinKits.flatMap((builtin) =>
    builtin.versions.map((text, index) => {
        const parsed = parseBuiltinKitSource(text);
        return {
            label: `${builtin.name} ${index + 1}`,
            builtin,
            version: index + 1,
            ...parsed,
            source: new Source(parsed.names, parsed.code),
        };
    }),
);

test('there are built-in kits to check', () => {
    // Every test below is `each` over these, so an empty manifest would pass them all.
    expect(versions.length).toBeGreaterThan(0);
    expect(built.length).toBe(versions.length);
});

describe.each(versions)('$label', (one) => {
    const project = Project.make(
        null,
        one.builtin.name,
        one.source,
        [],
        DefaultLocale,
    );

    test('is publishable as a kit', () => {
        const { empty, conflicts } = checkKit(one.source);
        const messages = conflicts.map((conflict) =>
            conflict
                .getMessage(project.getContext(one.source), Templates)
                .explanation(DefaultLocales, project.getContext(one.source))
                .toText(),
        );
        expect(empty, 'shares nothing').toBe(false);
        expect(conflicts, `not publishable:\n${messages.join('\n')}`).toEqual(
            [],
        );
    });

    test('has no conflicts of any kind', () => {
        // `checkKit` only asks what publishing demands. An unknown name, a type error, or
        // a ten-digit literal that reads as a phone number are all still conflicts, and a
        // creator who borrows this kit would see them in their own project.
        const context = project.getContext(one.source);
        const conflicts = Array.from(
            project.analyze().conflictedNodes.values(),
        ).flat();
        const messages = conflicts.map((conflict) =>
            conflict
                .getMessage(context, Templates)
                .explanation(DefaultLocales, context)
                .toText(),
        );
        expect(conflicts, `unexpected:\n${messages.join('\n')}`).toEqual([]);
    });

    test('has an example to preview', () => {
        expect(pickKitPreviewExample(one.source)).toBeDefined();
    });

    test('names a source and shares something', () => {
        // The source's names carry the locale tags saying what language the kit is
        // written in, which is what a borrowing project reads it with.
        expect(one.names).not.toBe('');
        expect(kitExports(one.source).length).toBeGreaterThan(0);
    });
});

test.each(built)('$version.id parses as a kit and a version', (one) => {
    // A document that fails to parse reads as "no such kit" everywhere downstream, which
    // is how an invalid UUID in a test fixture once looked like a missing kit for an
    // afternoon. `.uuid()` also constrains the fourth group, so this is not cosmetic.
    const kit = KitSchema.safeParse(one.kit);
    expect(kit.success ? [] : kit.error.issues).toEqual([]);
    const version = KitVersionSchema.safeParse(one.version);
    expect(version.success ? [] : version.error.issues).toEqual([]);
});

test('ids, names and version counts are sound', () => {
    const ids = BuiltinKits.map((kit) => kit.id);
    const names = BuiltinKits.map(builtinKitName);
    expect(new Set(ids).size, 'duplicate id').toBe(ids.length);
    expect(new Set(names).size, 'duplicate name').toBe(names.length);
    for (const kit of BuiltinKits) {
        expect(
            kit.versions.length,
            `${kit.name} has no versions`,
        ).toBeGreaterThan(0);
        expect(kit.versions.length).toBeLessThanOrEqual(MAX_KIT_VERSIONS);
    }
});

test('every registry entry stays within the kind cap', () => {
    for (const { kit } of built)
        expect(kit.kinds.length, kit.name).toBeLessThanOrEqual(MAX_KINDS);
});

test('the manifest lists every file on disk, and no others', () => {
    // A kit source that is in the repo but not in the manifest ships to nobody, and a
    // manifest entry with no file cannot build — neither fails anywhere else.
    const onDisk = readdirSync(KitsRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => ({
            name: entry.name,
            versions: readdirSync(`${KitsRoot}/${entry.name}`)
                .filter((file) => file.endsWith('.wp'))
                .map((file) => Number(file.replace('.wp', '')))
                .sort((a, b) => a - b),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    expect(onDisk).toEqual(
        BuiltinKits.map((kit) => ({
            name: kit.name,
            // Contiguous from 1: a version number is never reused and never skipped, so
            // `latest` and the files agree by construction.
            versions: kit.versions.map((_, index) => index + 1),
        })).sort((a, b) => a.name.localeCompare(b.name)),
    );
});

/**
 * A doc that counts something has to be counting the data beside it.
 *
 * Written because it caught one: the Russian alphabet shipped with 32 letters under a doc
 * claiming 33, having lost ё. Nothing else in the project compares a kit's prose with its
 * values, and a wrong count in a kit is read by people who cannot check it.
 */
const claims = versions.flatMap((one) =>
    kitExports(one.source).flatMap((exported) => {
        const text =
            docsFor(exported, one.source)?.docs[0]?.markup.toText() ?? '';
        const claim = text.match(/\b(?:The|All) ([0-9]+) /);
        if (claim === null || !('names' in exported)) return [];
        const name = exported.names.getNames()[0];
        return name === undefined
            ? []
            : [
                  {
                      label: `${one.label} ${name}`,
                      code: one.code,
                      name,
                      claimed: Number(claim[1]),
                      phrase: claim[0].trim(),
                  },
              ];
    }),
);

test('the docs that claim counts were found', () => {
    // Enumerated rather than checked in a loop, so a regex that silently stops matching
    // fails here instead of leaving every count unchecked and the suite green.
    expect(claims.length).toBeGreaterThanOrEqual(9);
});

test.each(claims)('$label: "$phrase…" is true', (claim) => {
    // A program's value is the list of its statements' values, so the appended expression
    // is the last one. Asking for a count rather than the list itself keeps that
    // unwrapping unambiguous: a number is never the wrapper.
    const value = evaluateCode(`${claim.code}\n${claim.name}.length()`);
    const last = value instanceof ListValue ? value.values.at(-1) : undefined;
    expect(last instanceof NumberValue ? last.toNumber() : -1).toBe(
        claim.claimed,
    );
});

/**
 * The whole point: a project that writes `↓ @wordplay/alphabets 1` gets the names.
 *
 * Resolution goes through `KitResolver`, which `KitDatabase` satisfies by seeding
 * `byName` and `versions` — so this builds the same two answers from the manifest and
 * asserts the borrow binds, type-checks, and evaluates. A test that only checked for the
 * absence of `UnknownKit` would pass against a kit that never resolved, so this asserts
 * what the kit *gives*.
 */
test.each(BuiltinKits)('$name can be borrowed', async (builtin) => {
    const name = builtinKitName(builtin);
    const entry = built.find((one) => one.kit.name === name);
    expect(entry).toBeDefined();
    if (entry === undefined) return;

    const resolver = {
        getByName: async (asked: string) =>
            asked === name ? { id: entry.kit.id } : null,
        getVersion: async (kit: string, version: number) => {
            const found = built.find(
                (one) =>
                    one.version.kit === kit && one.version.version === version,
            );
            return found === undefined ? null : found.version;
        },
    };

    // One export's name, asked for by the borrowing source, so this fails if the kit
    // resolves but binds nothing.
    const exported = entry.kit.exports[0];
    expect(exported).toBeDefined();
    const source = new Source(
        'main',
        `↓ @${name} ${entry.kit.latest}\n${exported}`,
    );
    const borrower = Project.make(null, 'borrower', source, [], DefaultLocale);
    const resolved = borrower.withDependencies(
        await resolveKits(borrower, resolver),
    );

    const context = resolved.getContext(source);
    const conflicts = Array.from(
        resolved.analyze().conflictedNodes.values(),
    ).flat();
    expect(
        conflicts.map((conflict) =>
            conflict
                .getMessage(context, Templates)
                .explanation(DefaultLocales, context)
                .toText(),
        ),
    ).toEqual([]);

    const evaluator = new Evaluator(resolved, DB, [DefaultLocale]);
    const value = evaluator.getInitialValue();
    expect(value).toBeDefined();
    expect(value?.toString()).not.toContain('ø');
});

/**
 * A borrowed export has to be usable, not merely bindable: an export whose type is
 * *inferred* from the kit's private helpers binds and prints for whoever borrows it, then
 * throws `FunctionException` on the first `.method()`, with no conflict anywhere.
 *
 * Checked by making a real call through a real borrow, since annotating the export is only
 * the current remedy and this is the property that matters. `checked` is asserted against
 * the number of list-typed exports found, so a day when nothing matches fails.
 */
test.each(BuiltinKits)(
    '$name survives being used, not just bound',
    async (builtin) => {
        const name = builtinKitName(builtin);
        const found = built.find((one) => one.kit.name === name);
        if (found === undefined) throw new Error(`no ${name}`);
        // Re-bound so the narrowing survives into the closure below.
        const entry = found;
        const resolver = {
            getByName: async (asked: string) =>
                asked === name ? { id: entry.kit.id } : null,
            getVersion: async (kit: string, version: number) =>
                built.find(
                    (one) =>
                        one.version.kit === kit &&
                        one.version.version === version,
                )?.version ?? null,
        };

        async function evaluate(code: string) {
            const source = new Source(
                'main',
                `↓ @${name} ${entry.kit.latest}\n${code}`,
            );
            const borrower = Project.make(
                null,
                'borrower',
                source,
                [],
                DefaultLocale,
            );
            const resolved = borrower.withDependencies(
                await resolveKits(borrower, resolver),
            );
            const value = new Evaluator(resolved, DB, [
                DefaultLocale,
            ]).getInitialValue();
            // A borrow plus one expression evaluates to that expression's value, with
            // no wrapper list — unlike a program of several statements.
            return value;
        }

        let lists = 0;
        for (const exported of entry.kit.exports) {
            if (!((await evaluate(exported)) instanceof ListValue)) continue;
            lists += 1;
            const counted = await evaluate(`${exported}.length()`);
            expect(
                counted instanceof NumberValue,
                `${exported} bound, but .length() on it failed through a borrow`,
            ).toBe(true);
        }
        expect(lists, 'no list export was actually called').toBeGreaterThan(0);
    },
    // Parses a kit, resolves a real borrow, and evaluates a real call, which for
    // instruments — nineteen of them, 996 lines — is ~2s unloaded. The default 5s left
    // too little headroom for a CI runner sharing cores between four workers, where this
    // timed out while passing every time locally.
    30000,
);
