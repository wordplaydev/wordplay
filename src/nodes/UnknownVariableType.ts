import UnknownType from './UnknownType';
import type { EvaluationType } from './Generics';
import type Translation from '../translations/Translation';

export class UnknownVariableType extends UnknownType<EvaluationType> {
    constructor(evaluate: EvaluationType) {
        super(evaluate, undefined);
    }

    getReason(translation: Translation) {
        return translation.nodes.UnknownVariableType.description;
    }
}
