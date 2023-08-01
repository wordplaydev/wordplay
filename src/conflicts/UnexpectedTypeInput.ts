import type Context from '@nodes/Context';
import type Evaluate from '@nodes/Evaluate';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import type NameType from '@nodes/NameType';
import type StructureDefinition from '@nodes/StructureDefinition';
import type Type from '@nodes/Type';
import NodeRef from '@locale/NodeRef';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';
import concretize from '../locale/concretize';

export default class UnexpectedTypeInput extends Conflict {
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
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.node.Evaluate.conflict.UnexpectedTypeInput
                            .primary,
                        new NodeRef(
                            this.definition.names,
                            locale,
                            context,
                            this.definition.names.getPreferredNameString([
                                locale,
                            ])
                        )
                    ),
            },
            secondary: {
                node: this.definition.names,
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.node.Evaluate.conflict.UnexpectedTypeInput
                            .secondary,
                        new NodeRef(this.type, locale, context)
                    ),
            },
        };
    }
}
