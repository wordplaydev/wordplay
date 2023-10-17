import UnknownType from './UnknownType';
import type This from './This';
import type Concretizer from './Concretizer';
import type Locales from '../locale/Locales';

export class UnenclosedType extends UnknownType<This> {
    constructor(dis: This) {
        super(dis, undefined);
    }

    getReason(concretize: Concretizer, locales: Locales) {
        return concretize(
            locales,
            locales.get((l) => l.node.NotEnclosedType.name)
        );
    }
}
