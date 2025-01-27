import Type from './Type';
import type { BasisTypeName } from '../basis/BasisConstants';
import type TypeSet from './TypeSet';
import type StreamDefinition from './StreamDefinition';
import Characters from '../lore/BasisCharacters';
import { STREAM_SYMBOL } from '../parser/Symbols';
import type Spaces from '../parser/Spaces';
import type Locales from '../locale/Locales';
import type { NodeDescriptor } from '@locale/NodeTexts';

export default class StreamDefinitionType extends Type {
    readonly definition: StreamDefinition;

    constructor(definition: StreamDefinition) {
        super();

        this.definition = definition;
    }

    getDescriptor(): NodeDescriptor {
        return 'StreamDefinitionType';
    }

    getGrammar() {
        return [];
    }
    computeConflicts() {
        return [];
    }

    /** Compatible if it's the same structure definition, or the given type is a refinement of the given structure.*/
    acceptsAll(types: TypeSet): boolean {
        return types.list().every((type) => {
            if (
                type instanceof StreamDefinitionType &&
                this.definition === type.definition
            )
                return true;
        });
    }

    simplify() {
        return new StreamDefinitionType(this.definition.withoutDocs());
    }

    getBasisTypeName(): BasisTypeName {
        return 'streamdefinition';
    }

    clone() {
        return new StreamDefinitionType(this.definition) as this;
    }

    /** Mirror StreamType */
    toWordplay(_: Spaces | undefined) {
        return `${STREAM_SYMBOL}${this.definition.output.toWordplay(_)}`;
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.StreamDefinitionType);
    }

    getCharacter() {
        return Characters.Stream;
    }
}
