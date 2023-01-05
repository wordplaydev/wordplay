import type Type from './Type';
import UnknownType from './UnknownType';
import type SetOrMapAccess from './SetOrMapAccess';
import type Translation from '../translations/Translation';

export class NotASetOrMapType extends UnknownType<SetOrMapAccess> {
    constructor(dis: SetOrMapAccess, why: Type) {
        super(dis, why);
    }

    getReason(translation: Translation) {
        return translation.types.NotASetOrMapType.description;
    }
}
