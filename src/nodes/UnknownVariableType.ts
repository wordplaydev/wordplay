import UnknownType from './UnknownType';
import type { EvaluationType } from './Generics';
import type Locales from '../locale/Locales';

export class UnknownVariableType extends UnknownType<EvaluationType> {
    constructor(evaluate: EvaluationType) {
        super(evaluate, undefined);
    }

    getReason(locales: Locales) {
        return locales.concretize((l) => l.node.UnknownVariableType.name);
    }
}
