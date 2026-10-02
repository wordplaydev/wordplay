import type Locales from '#locale/Locales.ts';
import type This from '#nodes/This.ts';
import UnknownType from '#nodes/UnknownType.ts';

export class UnenclosedType extends UnknownType<This> {
    constructor(dis: This) {
        super(dis, undefined);
    }

    getReason(locales: Locales) {
        return locales.concretize((l) => l.node.NotEnclosedType.name);
    }
}
