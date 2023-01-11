import UnknownType from './UnknownType';
import type This from './This';
import type Translation from '../translation/Translation';

export class UnenclosedType extends UnknownType<This> {
    constructor(dis: This) {
        super(dis, undefined);
    }

    getReason(translation: Translation) {
        return translation.nodes.NotEnclosedType.description;
    }
}
