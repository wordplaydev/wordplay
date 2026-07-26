import Templates from '@concepts/Templates';
import UnusedBind from '@conflicts/UnusedBind';
import DefaultLocales from '@locale/DefaultLocales';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import Source from '@nodes/Source';
import UnparsableExpression from '@nodes/UnparsableExpression';
import UnparsableType from '@nodes/UnparsableType';
import { expect, test } from 'vitest';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import Example from '@nodes/Example';
import { Basis } from '@basis/Basis';
import Locales, { MULTILINGUAL_SEPARATOR } from '@locale/Locales';
import concretize from '@locale/concretize';

const basis = Basis.getLocalizedBasis(DefaultLocales);

// Two locales can share a language but define different names (zh-CN vs zh-TW), so the basis
// cache has to key on region too, or whichever loads second silently gets the other's basis.
test('the basis cache distinguishes locales sharing a language', () => {
    const forRegion = (region: 'CN' | 'TW') =>
        Basis.getLocalizedBasis(
            new Locales(
                concretize,
                [{ ...DefaultLocale, language: 'zh', regions: [region] }],
                DefaultLocale,
            ),
        );
    expect(forRegion('CN')).not.toBe(forRegion('TW'));
    // The same locale still hits the cache rather than rebuilding.
    expect(forRegion('CN')).toBe(forRegion('CN'));
});

const source = new Source('basis', '');
const project = Project.make(null, 'test', source, [], DefaultLocale);
const context = project.getContext(source);

/** A name that could be suffixed and still be a valid name (so operators and symbols are left alone). */
const Alphabetic = /^\p{L}[\p{L}\p{N}]*$/u;

/** Replace one `names` value with names that differ from en-US's: symbolic entries dropped,
 *  alphabetic ones suffixed. Falls back to the original if that would leave nothing. */
function distinguishNames(value: unknown): unknown {
    if (typeof value === 'string')
        return Alphabetic.test(value) ? `${value}X` : value;
    if (Array.isArray(value)) {
        const distinct = value
            .filter(
                (name): name is string =>
                    typeof name === 'string' && Alphabetic.test(name),
            )
            .map((name) => `${name}X`);
        return distinct.length > 0 ? distinct : value;
    }
    return value;
}

/** Rewrite every `names` (the NameText fields) in place. A locale can lose its symbolic name and
 *  differ from en-US in its first name — that's what #1228 was — and only such a locale reveals
 *  basis code that joins names across locales instead of resolving one. */
function distinguishAllNames(value: unknown): void {
    if (Array.isArray(value)) {
        for (const item of value) distinguishAllNames(item);
        return;
    }
    if (value === null || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
        if (key === 'names') Reflect.set(value, key, distinguishNames(child));
        else distinguishAllNames(child);
    }
}

function makeDistinctLocale(): LocaleText {
    const locale = structuredClone(DefaultLocale);
    distinguishAllNames(locale);
    return { ...locale, language: 'zh', regions: ['CN'] };
}

const DistinctLocale = makeDistinctLocale();
const multilingualBasis = Basis.getLocalizedBasis(
    new Locales(concretize, [DefaultLocale, DistinctLocale], DefaultLocale),
);
const multilingualSource = new Source('basis', '');
const multilingualProject = Project.make(
    null,
    'test',
    multilingualSource,
    [],
    [DefaultLocale, DistinctLocale],
);
const multilingualContext = multilingualProject.getContext(multilingualSource);

function checkBasisNodes(node: Node, context: Context) {
    // Check for syntax errors
    const unparsables = node
        .nodes()
        .filter(
            (n): n is UnparsableExpression | UnparsableType =>
                n instanceof UnparsableExpression ||
                n instanceof UnparsableType,
        );

    expect(
        unparsables,
        'Unparsable at: `' +
            node.toWordplay().substring(0, 30) +
            '...' +
            unparsables
                .map((unp) => unp.unparsables.map((t) => t.toWordplay()).join())
                .join() +
            '`',
    ).toHaveLength(0);

    // Check for conflicts, ignoring unused binds.
    const conflicts = node.getAllConflicts(context).filter(
        (conflict) =>
            !(conflict instanceof UnusedBind) &&
            !context
                .getRoot(node)
                ?.getAncestors(
                    conflict.getConflictingNode(context, Templates),
                )
                .some((n) => n instanceof Example),
    );

    expect(
        conflicts,
        conflicts
            .map((c) =>
                c
                    .getMessage(context, Templates)
                    .explanation(DefaultLocales, context)
                    .toText(),
            )
            .join(),
    ).toHaveLength(0);
}

test.each([
    // Test all of the structure definitions
    ...Object.values(basis.structureDefinitionsByName).map(
        (structure) => [structure.getNames()[0], structure] as const,
    ),
    // Test all of the functions
    ...Object.values(basis.functionsByType)
        .map((funs) => Object.values(funs))
        .flat()
        .map((fun) => [fun.getNames()[0], fun] as const),
    // Test all of the conversions
    ...Object.values(basis.conversionsByType)
        .map((funs) => Object.values(funs))
        .flat()
        .map(
            (fun) =>
                [
                    fun.input.toWordplay() + ' → ' + fun.output.toWordplay(),
                    fun,
                ] as const,
        ),
    // Test all of the shares
    ...Object.values(basis.shares)
        .map((funs) => Object.values(funs))
        .flat()
        .map((fun) => [fun.getNames()[0], fun] as const),
])('%s should have no conflicts', (_, node) => {
    checkBasisNodes(node, context);
});

// The suite above only ever builds a one-locale basis, which is why #1228 shipped: basis code that
// joined a name across every chosen locale ("📍 · Posición") produced an unresolvable identifier,
// and there was no multi-locale basis to catch it.
test.each(
    Object.values(multilingualBasis.shares)
        .map((shares) => Object.values(shares))
        .flat()
        .map((share) => [share.getNames()[0], share] as const),
)('%s should have no conflicts in two locales', (_, node) => {
    checkBasisNodes(node, multilingualContext);
});

// A catch-all for the same class: no name or code in the basis may be several locales joined
// together, whatever field it came from.
test('no basis node joins locales into one token', () => {
    const joined = multilingualBasis
        .getRoots()
        .map((root) => root.root.nodes())
        .flat()
        .filter((node) => node.toWordplay().includes(MULTILINGUAL_SEPARATOR));
    expect(
        joined.map((node) => node.toWordplay()),
        'These node(s) contain the multilingual separator, so locale text was joined where a single locale was needed',
    ).toHaveLength(0);
});

// The report in #1228: a two-locale project placing a character with the Placement stream.
test('a two-locale project can evaluate Placement', () => {
    const placement = new Source(
        'placement',
        `where: ${multilingualProject.shares.input.Placement.getNames()[0]}(${multilingualProject.shares.output.Place.getNames()[0]}(0m 0m))\nwhere`,
    );
    const placementProject = Project.make(
        null,
        'test',
        placement,
        [],
        [DefaultLocale, DistinctLocale],
    );
    const placementContext = placementProject.getContext(placement);
    const conflicts = placementProject
        .analyze()
        .conflicts.filter((conflict) => !(conflict instanceof UnusedBind));
    expect(
        conflicts,
        conflicts
            .map((conflict) =>
                conflict
                    .getMessage(placementContext, Templates)
                    .explanation(DefaultLocales, placementContext)
                    .toText(),
            )
            .join(),
    ).toHaveLength(0);
});
