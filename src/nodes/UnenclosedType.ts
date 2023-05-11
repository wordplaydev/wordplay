import UnknownType from './UnknownType';
import type This from './This';
import type Locale from '@translation/Locale';

export class UnenclosedType extends UnknownType<This> {
    constructor(dis: This) {
        super(dis, undefined);
    }

    getReason(translation: Locale) {
        return translation.node.NotEnclosedType.description;
    }
}
