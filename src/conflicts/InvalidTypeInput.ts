import type Context from '../nodes/Context';
import type Evaluate from '../nodes/Evaluate';
import type FunctionDefinition from '../nodes/FunctionDefinition';
import type NameType from '../nodes/NameType';
import type StructureDefinition from '../nodes/StructureDefinition';
import type Type from '../nodes/Type';
import NodeLink from '../translations/NodeLink';
import type Translation from '../translations/Translation';
import Conflict from './Conflict';

export default class InvalidTypeInput extends Conflict {
    readonly evaluate: NameType | Evaluate;
    readonly type: Type;
    readonly definition: StructureDefinition | FunctionDefinition;

    constructor(
        evaluate: NameType | Evaluate,
        type: Type,
        definition: StructureDefinition | FunctionDefinition
    ) {
        super(false);
        this.evaluate = evaluate;
        this.type = type;
        this.definition = definition;
    }

    getConflictingNodes() {
        return { primary: this.type, secondary: this.definition.names };
    }

    getPrimaryExplanation(translation: Translation, context: Context) {
        return translation.conflict.InvalidTypeInput.primary(
            new NodeLink(
                this.definition.names,
                translation,
                context,
                this.definition.names.getTranslation(translation.language)
            )
        );
    }

    getSecondaryExplanation(translation: Translation, context: Context) {
        return translation.conflict.InvalidTypeInput.secondary(
            new NodeLink(this.type, translation, context)
        );
    }
}
