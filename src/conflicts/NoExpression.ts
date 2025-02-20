import type FunctionDefinition from '@nodes/FunctionDefinition';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

export default class NoExpression extends Conflict {
    readonly def: FunctionDefinition;

    constructor(def: FunctionDefinition) {
        super(true);

        this.def = def;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.def.names,
                explanation: (locales: Locales) =>
                    locales.concretize(
                        (l) => l.node.FunctionDefinition.conflict.NoExpression,
                    ),
            },
        };
    }
}
