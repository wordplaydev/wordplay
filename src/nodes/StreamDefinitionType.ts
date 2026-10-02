import { Purpose } from '#concepts/Purpose.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import type { BasisTypeName } from '#basis/BasisConstants.ts';
import Characters from '../lore/BasisCharacters';
import type Spaces from '#parser/Spaces.ts';
import { STREAM_SYMBOL } from '#parser/Symbols.ts';
import type StreamDefinition from '#nodes/StreamDefinition.ts';
import Type from '#nodes/Type.ts';
import type TypeSet from '#nodes/TypeSet.ts';

export default class StreamDefinitionType extends Type {
    readonly definition: StreamDefinition;

    constructor(definition: StreamDefinition) {
        super();

        this.definition = definition;
    }

    getDescriptor(): NodeDescriptor {
        return 'StreamDefinitionType';
    }

    getPurpose() {
        return Purpose.Hidden;
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
        return this.cloned(new StreamDefinitionType(this.definition));
    }

    /** Mirror StreamType */
    toWordplay(_: Spaces | undefined) {
        return `${STREAM_SYMBOL}${this.definition.output.toWordplay(_)}`;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.StreamDefinitionType;
    getLocalePath() {
        return StreamDefinitionType.LocalePath;
    }

    getCharacter() {
        return Characters.Stream;
    }
}
