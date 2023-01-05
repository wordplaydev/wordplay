import UnknownType from './UnknownType';
import type This from './This';
import type Translation from '../translations/Translation';

export class UnenclosedType extends UnknownType<This> {
    constructor(dis: This) {
        super(dis, undefined);
    }

    getReason(translation: Translation): string {
        return translation.types.NotEnclosedType.description;
    }
}
