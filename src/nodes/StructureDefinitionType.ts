import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import type { BasisTypeName } from '../basis/BasisConstants';
import type Locales from '../locale/Locales';
import Characters from '../lore/BasisCharacters';
import type Spaces from '../parser/Spaces';
import type Context from './Context';
import type StructureType from './StructureType';
import Type from './Type';
import type TypeSet from './TypeSet';

export default class StructureDefinitionType extends Type {
    readonly type: StructureType;

    constructor(definition: StructureType) {
        super();

        this.type = definition;
    }

    getDescriptor(): NodeDescriptor {
        return 'StructureDefinitionType';
    }

    getGrammar() {
        return [];
    }

    computeConflicts() {
        return [];
    }

    /** Compatible if it's the same structure definition, or the given type is a refinement of the given structure.*/
    acceptsAll(types: TypeSet, context: Context): boolean {
        return types.list().every((type) => this.type.accepts(type, context));
    }

    simplify() {
        return this;
    }

    getDescriptionInputs(locales: Locales) {
        return [locales.getName(this.type.definition.names)];
    }

    getBasisTypeName(): BasisTypeName {
        return 'structuredefinition';
    }

    clone() {
        return new StructureDefinitionType(this.type) as this;
    }

    toWordplay(_: Spaces | undefined, locale: LocaleText | undefined) {
        return locale
            ? this.type.definition.names.getPreferredNameString([locale])
            : (this.type.definition.names.getFirst() ?? '');
    }

    static readonly LocalePath = (l: LocaleText) =>
        l.node.StructureDefinitionType;
    getLocalePath() {
        return StructureDefinitionType.LocalePath;
    }

    getCharacter() {
        return Characters.Type;
    }

    getDefaultExpression(context: Context) {
        return this.type.getDefaultExpression(context);
    }
}
