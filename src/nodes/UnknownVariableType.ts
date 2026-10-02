import type Locales from '#locale/Locales.ts';
import type { EvaluationType } from '#nodes/Generics.ts';
import UnknownType from '#nodes/UnknownType.ts';

export class UnknownVariableType extends UnknownType<EvaluationType> {
    constructor(evaluate: EvaluationType) {
        super(evaluate, undefined);
    }

    getReason(locales: Locales) {
        return locales.concretize((l) => l.node.UnknownVariableType.name);
    }
}
