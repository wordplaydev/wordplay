/**
 * What a kit shares, as concept ids (#8) — the registry's browse filter, since a creator
 * looking for colours wants the kits that give them a `Color` whatever those kits are
 * called, and a name cannot answer that.
 *
 * **Ids, never names**: a basis definition's names come from the publisher's locale, so
 * keying off one would file a kit published in Marathi under a bucket no English reader
 * could select. And **the vocabulary is the basis, not a list** — every key of
 * `shares.input` and `shares.output` plus the ten primitives below, about 74 ids, growing
 * when the basis does, so the filter row grows with the registry rather than being a
 * fixed set of tabs.
 *
 * Computed on the client at publish, because `functions/` cannot reach the parser and a
 * type is unreadable without one. See `kinds` in `Kit.ts` for what that costs.
 */
import type Context from '@nodes/Context';
import Bind from '@nodes/Bind';
import ConversionDefinition from '@nodes/ConversionDefinition';
import FunctionDefinition from '@nodes/FunctionDefinition';
import ListType from '@nodes/ListType';
import MapType from '@nodes/MapType';
import NoneType from '@nodes/NoneType';
import SetType from '@nodes/SetType';
import type Source from '@nodes/Source';
import StructureDefinition from '@nodes/StructureDefinition';
import StructureDefinitionType from '@nodes/StructureDefinitionType';
import StructureType from '@nodes/StructureType';
import type Type from '@nodes/Type';
import UnionType from '@nodes/UnionType';
import { kitExports } from '@nodes/publishedShare';

/** A bound on the index, not a curation — see `MAX_WORDS` in `kitEdited.ts`. */
export const MAX_KINDS = 20;

/**
 * Concept ids for the types that aren't structures.
 *
 * `measurement` is the one name that disagrees with its concept id: the runtime calls it
 * a measurement and every reader calls it a number.
 */
const BasisKinds: Record<string, string> = {
    none: 'None',
    boolean: 'Boolean',
    measurement: 'Number',
    text: 'Text',
    formatted: 'Formatted',
    list: 'List',
    set: 'Set',
    map: 'Map',
    table: 'Table',
    range: 'Range',
};

/**
 * The one basis share whose record key isn't its concept id.
 *
 * `createDefaultShares` files the source type under `Data` while the locale calls it
 * `Source`. `kitKinds.test.ts` walks every share and fails if another one drifts, which
 * is the risk a hand-maintained vocabulary list would hide rather than catch.
 */
const KindOverrides: Record<string, string> = { Data: 'Source' };

/** The concept ids one type stands for. Exported for its own tests. */
function typeKinds(type: Type, context: Context): string[] {
    // A `•…Color` is a source of colours, so the stream wrapper says nothing here.
    const concrete = type.withoutStream(context);

    if (concrete instanceof UnionType) {
        const members = concrete
            .enumerate()
            .flatMap((member) => typeKinds(member, context));
        // `Color|ø` is an optional colour, not a kit that shares nothing. Only a type
        // that is *nothing but* none keeps `None`.
        const named = members.filter((kind) => kind !== 'None');
        return named.length > 0 ? named : members;
    }

    // A structure's own type, reached through the definition either way.
    const structure =
        concrete instanceof StructureDefinitionType
            ? concrete.type
            : concrete instanceof StructureType
              ? concrete
              : undefined;
    if (structure !== undefined) {
        const shares = context.project.shares;
        for (const [key, share] of Object.entries({
            ...shares.input,
            ...shares.output,
        }))
            // By identity, the way structure types are already compared — a name would
            // be the publisher's locale's.
            if (share === structure.definition)
                return [KindOverrides[key] ?? key];
        // Something the creator defined: a kit that gives you a new kind of thing.
        return ['Structure'];
    }

    // A container is both itself and what it holds. Without the recursion the palette
    // kit this feature exists for — `↑ sunset: [🌈(…) 🌈(…)]` — would be filed under
    // List and appear in no colour filter at all.
    if (concrete instanceof ListType) {
        const item = concrete.getItemType(context);
        return ['List', ...(item ? typeKinds(item, context) : [])];
    }
    if (concrete instanceof SetType)
        return [
            'Set',
            ...(concrete.key ? typeKinds(concrete.key, context) : []),
        ];
    if (concrete instanceof MapType)
        return [
            'Map',
            ...(concrete.key ? typeKinds(concrete.key, context) : []),
            ...(concrete.value ? typeKinds(concrete.value, context) : []),
        ];
    if (concrete instanceof NoneType) return ['None'];

    const basis = BasisKinds[concrete.getBasisTypeName()];
    // `unknown`, `never`, `any`, `variable`, `function` and the rest deliberately yield
    // nothing: a type error is not a category, and a function is already represented by
    // the type of what it returns.
    return basis === undefined ? [] : [basis];
}

/** Every concept id a source's `↑` exports carry, deduplicated, sorted, and capped. */
export default function kitKinds(source: Source, context: Context): string[] {
    const kinds = new Set<string>();
    for (const shared of kitExports(source)) {
        // What a reader gets from each kind of export: a bind's value, what a function or
        // a conversion produces, and a structure itself.
        const type =
            shared instanceof Bind
                ? shared.getType(context)
                : shared instanceof FunctionDefinition
                  ? shared.getOutputType(context)
                  : shared instanceof ConversionDefinition
                    ? shared.output.concretize(context)
                    : shared instanceof StructureDefinition
                      ? new StructureType(shared, [])
                      : undefined;
        if (type === undefined) continue;
        for (const kind of typeKinds(type, context)) kinds.add(kind);
    }
    // Sorted so the trigger's before/after comparison is a cheap positional one, and so a
    // kit that reaches the cap truncates the same way every time.
    return [...kinds].sort().slice(0, MAX_KINDS);
}
