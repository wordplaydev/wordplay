import UnknownType from './UnknownType';
import type This from './This';
import type Locale from '@locale/Locale';
import type Concretizer from './Concretizer';

export class UnenclosedType extends UnknownType<This> {
    constructor(dis: This) {
        super(dis, undefined);
    }

    getReason(concretize: Concretizer, locale: Locale) {
        return concretize(locale, locale.node.NotEnclosedType.name);
    }
}
