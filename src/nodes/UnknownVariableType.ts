import UnknownType from './UnknownType';
import type { EvaluationType } from './Generics';
import type Locale from '@locale/Locale';
import concretize from '../locale/locales/concretize';

export class UnknownVariableType extends UnknownType<EvaluationType> {
    constructor(evaluate: EvaluationType) {
        super(evaluate, undefined);
    }

    getReason(locale: Locale) {
        return concretize(locale, locale.node.UnknownVariableType.description);
    }
}
