import type Locales from '../locale/Locales';
import type { EvaluationType } from './Generics';
import UnknownType from './UnknownType';

export class UnknownVariableType extends UnknownType<EvaluationType> {
    constructor(evaluate: EvaluationType) {
        super(evaluate, undefined);
    }

    getReason(locales: Locales) {
        return locales.concretize((l) => l.node.UnknownVariableType.name);
    }
}
