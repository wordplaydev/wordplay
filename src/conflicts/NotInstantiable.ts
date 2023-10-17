import type Evaluate from '@nodes/Evaluate';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import type StructureDefinition from '@nodes/StructureDefinition';
import Conflict from './Conflict';
import concretize from '../locale/concretize';
import type Locales from '../locale/Locales';

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
                explanation: (locales: Locales) =>
                    concretize(
                        locales,
                        locales.get(
                            (l) => l.node.Evaluate.conflict.NotInstantiable
                        )
                    ),
            },
        };
    }
}
