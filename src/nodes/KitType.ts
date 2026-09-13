import type { BasisTypeName } from '@basis/BasisConstants';
import { Purpose } from '@concepts/Purpose';
import type LocaleText from '@locale/LocaleText';
import type Locales from '@locale/Locales';
import type { NodeDescriptor } from '@locale/NodeTexts';
import type Context from '@nodes/Context';
import type Definition from '@nodes/Definition';
import type Node from '@nodes/Node';
import type Source from '@nodes/Source';
import Type from '@nodes/Type';
import type TypeSet from '@nodes/TypeSet';
import type Spaces from '@parser/Spaces';
import Characters from '../lore/BasisCharacters';

/**
 * A borrowed kit, as a namespace its exports are reached through (#1373).
 *
 * `↓ @amy/colors 3` brings every export into scope flat, which is fine for one kit and
 * collides for two — the names come from people who have never seen each other's code. This
 * is what makes `colors.sunset` say which one you mean: a `Reference` to a kit's `Source`
 * takes this type, and `PropertyReference` resolves the name after the dot against it.
 *
 * Only a *kit's* source has this type, never a local one. A bare local borrow binds that
 * source's evaluated value, which multi-source projects depend on, so giving it a namespace
 * would change what an existing program means.
 */
export default class KitType extends Type {
    readonly source: Source;

    constructor(source: Source) {
        super();

        this.source = source;
    }

    getDescriptor(): NodeDescriptor {
        return 'KitType';
    }

    getPurpose() {
        return Purpose.Types;
    }

    getGrammar() {
        return [];
    }

    computeConflicts() {
        return [];
    }

    /** Only the same kit. A namespace is a way to reach definitions, not a value to pass
     *  around, so nothing else is ever compatible with one. */
    acceptsAll(types: TypeSet): boolean {
        return types
            .list()
            .every(
                (type) =>
                    type instanceof KitType && type.source === this.source,
            );
    }

    /** What the kit exports, by name. */
    getDefinition(name: string): Definition | undefined {
        return this.source.getShare(name);
    }

    /** Expose the kit's exports for name resolution, the way `StructureDefinitionType` does
     *  for statics: without this the `Reference` child of `colors.sunset` walks an empty
     *  scope chain and `sunset` is flagged as `UnknownName`. */
    getDefinitions(_: Node, __: Context): Definition[] {
        return this.source.getShares();
    }

    getBasisTypeName(): BasisTypeName {
        return 'internal';
    }

    clone() {
        return new KitType(this.source) as this;
    }

    toWordplay(_: Spaces | undefined, locale: LocaleText | undefined) {
        return locale
            ? this.source.names.getPreferredNameString([locale])
            : (this.source.names.getFirst() ?? '');
    }

    getDescriptionInputs(locales: Locales) {
        return { name: locales.getDescriptiveName(this.source.names) };
    }

    static readonly LocalePath = (l: LocaleText) => l.node.KitType;
    getLocalePath() {
        return KitType.LocalePath;
    }

    getCharacter() {
        return Characters.Type;
    }
}
