import type Type from './Type';
import UnknownType from './UnknownType';
import type Translation from '../translations/Translation';
import type ListAccess from './ListAccess';

export class NotAListType extends UnknownType<ListAccess> {
    constructor(access: ListAccess, why: Type) {
        super(access, why);
    }

    getReason(translation: Translation) {
        return translation.types.NotAListType.description;
    }
}
