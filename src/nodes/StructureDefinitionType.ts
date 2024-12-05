import Type from './Type';
import type { BasisTypeName } from '../basis/BasisConstants';
import type TypeSet from './TypeSet';
import Glyphs from '../lore/Glyphs';
import type Spaces from '../parser/Spaces';
import type Locales from '../locale/Locales';
import type StructureType from './StructureType';
import type Context from './Context';
import type LocaleText from '@locale/LocaleText';

export default class StructureDefinitionType extends Type {
    readonly type: StructureType;

    constructor(definition: StructureType) {
        super();

        this.type = definition;
    }

    getDescriptor() {
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
            : this.type.definition.names.getFirst();
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.StructureDefinitionType);
    }

    getGlyphs() {
        return Glyphs.Type;
    }

    getDefaultExpression(context: Context) {
        return this.type.getDefaultExpression(context);
    }
}
