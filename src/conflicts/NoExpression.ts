import Conflict from './Conflict';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import concretize from '../locale/concretize';
import type Locales from '../locale/Locales';

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
                    concretize(
                        locales,
                        locales.get(
                            (l) =>
                                l.node.FunctionDefinition.conflict.NoExpression
                        )
                    ),
            },
        };
    }
}
