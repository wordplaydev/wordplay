import type Type from './Type';
import UnknownType from './UnknownType';
import type Locale from '@translation/Locale';
import type ListAccess from './ListAccess';

export class NotAListType extends UnknownType<ListAccess> {
    constructor(access: ListAccess, why: Type) {
        super(access, why);
    }

    getReason(translation: Locale) {
        return translation.node.NotAListType.description;
    }
}
