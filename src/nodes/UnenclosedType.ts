import UnknownType from './UnknownType';
import type This from './This';
import type Locales from '../locale/Locales';

export class UnenclosedType extends UnknownType<This> {
    constructor(dis: This) {
        super(dis, undefined);
    }

    getReason(locales: Locales) {
        return locales.concretize((l) => l.node.NotEnclosedType.name);
    }
}
