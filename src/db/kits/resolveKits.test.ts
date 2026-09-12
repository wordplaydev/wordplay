import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Evaluate from '@nodes/Evaluate';
import Source from '@nodes/Source';
import { expect, test } from 'vitest';
import { kitsNeededBy, resolveKits, type KitResolver } from './resolveKits';

function projectWith(code: string) {
    return Project.make(null, 't', new Source('main', code), [], DefaultLocale);
}

/** A resolver over an in-memory catalogue, so none of this touches Firestore. */
function resolver(
    catalogue: Record<
        string,
        {
            id: string;
            versions: Record<number, { code: string; public?: boolean }>;
        }
    >,
): KitResolver {
    return {
        getByName: async (name) => catalogue[name] ?? null,
        getVersion: async (kit, version) => {
            const entry = Object.values(catalogue).find((k) => k.id === kit);
            const published = entry?.versions[version];
            return published === undefined
                ? null
                : {
                      sourceName: 'colors/en',
                      code: published.code,
                      public: published.public ?? true,
                  };
        },
    };
}

const catalogue = {
    'amy/colors': { id: 'kit1', versions: { 1: { code: '↑ sunset/en: 1' } } },
};

test('a project that borrows nothing needs nothing', () => {
    expect(kitsNeededBy(projectWith(`1 + 1`))).toEqual([]);
});

test('two borrows of one kit and version are fetched once', () => {
    // Otherwise every named import of a kit is its own round trip.
    const project = projectWith(
        `↓ @amy/colors.sunset 1\n↓ @amy/colors.dawn 1\nsunset`,
    );
    expect(kitsNeededBy(project)).toHaveLength(1);
});

test('a borrow with no version asks for nothing', () => {
    // It is already a MissingKitVersion conflict; there is no version to fetch.
    expect(kitsNeededBy(projectWith(`↓ @amy/colors.sunset\nsunset`))).toEqual(
        [],
    );
});

test('a resolved kit parses into a usable source', async () => {
    const project = projectWith(`↓ @amy/colors.sunset 1\nsunset`);
    const resolved = await resolveKits(project, resolver(catalogue));
    const dependency = resolved.get('amy/colors@1');
    expect(dependency?.status).toBe('loaded');
    // And the project it produces actually evaluates the borrowed name.
    expect(project.withDependencies(resolved).dependenciesSettled()).toBe(true);
});

test('an unknown kit is missing, not loading', async () => {
    // `dependenciesSettled` gates evaluation, so a project that could never finish
    // loading would never run at all.
    const project = projectWith(`↓ @nobody/nothing.x 1\nx`);
    const resolved = await resolveKits(project, resolver(catalogue));
    expect(resolved.get('nobody/nothing@1')?.status).toBe('missing');
});

test('a version that does not exist is missing', async () => {
    const project = projectWith(`↓ @amy/colors.sunset 9\nsunset`);
    const resolved = await resolveKits(project, resolver(catalogue));
    expect(resolved.get('amy/colors@9')?.status).toBe('missing');
});

test('a taken-down version is blocked, which is a different thing', async () => {
    // One is a typo; the other is a decision, and a creator deserves to be told which.
    const project = projectWith(`↓ @amy/colors.sunset 1\nsunset`);
    const resolved = await resolveKits(
        project,
        resolver({
            'amy/colors': {
                id: 'kit1',
                versions: { 1: { code: '↑ sunset/en: 1', public: false } },
            },
        }),
    );
    expect(resolved.get('amy/colors@1')?.status).toBe('blocked');
});

test('a resolved project records its dependencies for the reuse index', async () => {
    const project = projectWith(`↓ @amy/colors.sunset 1\nsunset`);
    const resolved = await resolveKits(project, resolver(catalogue));
    const keys = project.withDependencies(resolved).getDependencyKeys();
    // The version, and the export actually named — which is what a kit's author is
    // shown a count of.
    expect(keys).toContain('kit1@1');
    expect(keys).toContain('kit1@1#sunset');
});

test('an unresolved project keeps the index it was stored with', async () => {
    // Recomputing mid-load would quietly erase what a previous save built, and an index
    // that empties itself on every cold start would undercount every kit in the registry.
    const project = projectWith(`↓ @amy/colors.sunset 1\nsunset`);
    expect(project.dependenciesSettled()).toBe(true);
    const loading = project.withDependencies(
        new Map([['amy/colors@1', { status: 'loading' } as const]]),
    );
    expect(loading.dependenciesSettled()).toBe(false);
    expect(loading.getDependencyKeys()).toEqual([]);
});

test("a borrowed export's type resolves through the kit's own private scope", async () => {
    /*
     * A kit's block has to expose its own statements to its own nodes, whichever source
     * the asking context belongs to. `Block.getStatementIndexContaining` used the
     * *context's* source root to test containment, so for a borrowed kit — whose root is
     * in `project.roots` but not in `getSources()` — nothing inside it could see anything
     * else inside it. The damage was remote and silent: an export whose type is inferred
     * through a private helper bound and printed correctly, and then every `.method()` on
     * it halted with `FunctionException`, with no conflict raised to say why.
     */
    const project = projectWith('↓ @amy/colors 1\nletters.length()');
    const resolved = project.withDependencies(
        await resolveKits(
            project,
            resolver({
                'amy/colors': {
                    id: 'kit1',
                    versions: {
                        1: {
                            // The private helper is the point: with `letters` typed
                            // explicitly, or built from a literal, this passed either way.
                            code: "ƒ chars(text•'') text → ['']\n↑ letters/en: chars('abc')",
                        },
                    },
                },
            }),
        ),
    );
    const context = resolved.getContext(resolved.getMain());
    const call = resolved
        .getMain()
        .nodes()
        .find((node): node is Evaluate => node instanceof Evaluate);
    expect(call).toBeDefined();
    expect(call?.getFunction(context)).toBeDefined();
    expect(
        Array.from(resolved.analyze().conflictedNodes.values()).flat(),
    ).toEqual([]);
});
