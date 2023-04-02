import UnknownType from './UnknownType';
import type { EvaluationType } from './Generics';
import type Translation from '@translation/Translation';

export class UnknownVariableType extends UnknownType<EvaluationType> {
    constructor(evaluate: EvaluationType) {
        super(evaluate, undefined);
    }

    getReason(translation: Translation) {
        return translation.node.UnknownVariableType.description;
    }
}
