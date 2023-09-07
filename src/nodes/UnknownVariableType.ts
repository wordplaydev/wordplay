import UnknownType from './UnknownType';
import type { EvaluationType } from './Generics';
import type Locale from '@locale/Locale';
import type Concretizer from './Concretizer';

export class UnknownVariableType extends UnknownType<EvaluationType> {
    constructor(evaluate: EvaluationType) {
        super(evaluate, undefined);
    }

    getReason(concretize: Concretizer, locale: Locale) {
        return concretize(locale, locale.node.UnknownVariableType.name);
    }
}
