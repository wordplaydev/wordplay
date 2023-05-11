import UnknownType from './UnknownType';
import type { EvaluationType } from './Generics';
import type Locale from '@locale/Locale';

export class UnknownVariableType extends UnknownType<EvaluationType> {
    constructor(evaluate: EvaluationType) {
        super(evaluate, undefined);
    }

    getReason(translation: Locale) {
        return translation.node.UnknownVariableType.description;
    }
}
