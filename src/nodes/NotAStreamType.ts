import type Type from './Type';
import UnknownType from './UnknownType';
import type Changed from './Changed';
import type Previous from './Previous';
import type Locale from '@locale/Locale';

export class NotAStreamType extends UnknownType<Previous | Changed> {
    constructor(previous: Previous | Changed, why: Type) {
        super(previous, why);
    }

    getReason(translation: Locale) {
        return translation.node.NotAStreamType.description;
    }
}
