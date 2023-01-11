import type Context from '../nodes/Context';
import type Evaluate from '../nodes/Evaluate';
import type FunctionDefinition from '../nodes/FunctionDefinition';
import type NameType from '../nodes/NameType';
import type StructureDefinition from '../nodes/StructureDefinition';
import type Type from '../nodes/Type';
import NodeLink from '../translation/NodeLink';
import type Translation from '../translation/Translation';
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
        return {
            primary: {
                node: this.type,
                explanation: (translation: Translation, context: Context) =>
                    translation.conflict.InvalidTypeInput.primary(
                        new NodeLink(
                            this.definition.names,
                            translation,
                            context,
                            this.definition.names.getTranslation(
                                translation.language
                            )
                        )
                    ),
            },
            secondary: {
                node: this.definition.names,
                explanation: (translation: Translation, context: Context) =>
                    translation.conflict.InvalidTypeInput.secondary(
                        new NodeLink(this.type, translation, context)
                    ),
            },
        };
    }
}
