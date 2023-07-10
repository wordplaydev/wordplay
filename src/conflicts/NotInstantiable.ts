import type Evaluate from '@nodes/Evaluate';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import type StructureDefinition from '@nodes/StructureDefinition';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';
import concretize from '../locale/concretize';

export default class NotInstantiable extends Conflict {
    readonly evaluate: Evaluate;
    readonly definition: StructureDefinition;
    readonly abstractFunctions: FunctionDefinition[];

    constructor(
        evaluate: Evaluate,
        definition: StructureDefinition,
        abstractFunctions: FunctionDefinition[]
    ) {
        super(false);

        this.evaluate = evaluate;
        this.definition = definition;
        this.abstractFunctions = abstractFunctions;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.evaluate,
                explanation: (locale: Locale) =>
                    concretize(
                        locale,
                        locale.node.Evaluate.conflict.NotInstantiable
                    ),
            },
        };
    }
}
