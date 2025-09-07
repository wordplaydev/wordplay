import type Evaluate from '@nodes/Evaluate';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import type StructureDefinition from '@nodes/StructureDefinition';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

export default class NotInstantiable extends Conflict {
    readonly evaluate: Evaluate;
    readonly definition: StructureDefinition;
    readonly abstractFunctions: FunctionDefinition[];

    constructor(
        evaluate: Evaluate,
        definition: StructureDefinition,
        abstractFunctions: FunctionDefinition[],
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
                    locales.concretize(
                        (l) => l.node.Evaluate.conflict.NotInstantiable,
                    ),
            },
        };
    }
}
