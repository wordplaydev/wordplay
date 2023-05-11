import type Type from './Type';
import UnknownType from './UnknownType';
import type SetOrMapAccess from './SetOrMapAccess';
import type Locale from '@translation/Locale';

export class NotASetOrMapType extends UnknownType<SetOrMapAccess> {
    constructor(dis: SetOrMapAccess, why: Type) {
        super(dis, why);
    }

    getReason(translation: Locale) {
        return translation.node.NotASetOrMapType.description;
    }
}
