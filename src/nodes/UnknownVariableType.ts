import type Locales from '@locale/Locales';
import type { EvaluationType } from '@nodes/Generics';
import UnknownType from '@nodes/UnknownType';

export class UnknownVariableType extends UnknownType<EvaluationType> {
    constructor(evaluate: EvaluationType) {
        super(evaluate, undefined);
    }

    getReason(locales: Locales) {
        return locales.concretize((l) => l.node.UnknownVariableType.name);
    }
}
