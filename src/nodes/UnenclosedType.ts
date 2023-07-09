import UnknownType from './UnknownType';
import type This from './This';
import type Locale from '@locale/Locale';
import concretize from '../locale/concretize';

export class UnenclosedType extends UnknownType<This> {
    constructor(dis: This) {
        super(dis, undefined);
    }

    getReason(locale: Locale) {
        return concretize(locale, locale.node.NotEnclosedType.description);
    }
}
