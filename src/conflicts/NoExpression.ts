import Conflict from './Conflict';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import type Locale from '@locale/Locale';
import concretize from '../locale/concretize';

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
                explanation: (translation: Locale) =>
                    concretize(translation, translation.conflict.NoExpression),
            },
        };
    }
}
