import type Locales from '../locale/Locales';
import type This from './This';
import UnknownType from './UnknownType';

export class UnenclosedType extends UnknownType<This> {
    constructor(dis: This) {
        super(dis, undefined);
    }

    getReason(locales: Locales) {
        return locales.concretize((l) => l.node.NotEnclosedType.name);
    }
}
