import UnknownType from './UnknownType';
import type { EvaluationType } from './Generics';
import type Concretizer from './Concretizer';
import type Locales from '../locale/Locales';

export class UnknownVariableType extends UnknownType<EvaluationType> {
    constructor(evaluate: EvaluationType) {
        super(evaluate, undefined);
    }

    getReason(concretize: Concretizer, locales: Locales) {
        return concretize(
            locales,
            locales.get((l) => l.node.UnknownVariableType.name)
        );
    }
}
