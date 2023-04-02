import type Type from './Type';
import UnknownType from './UnknownType';
import type Changed from './Changed';
import type Previous from './Previous';
import type Translation from '@translation/Translation';

export class NotAStreamType extends UnknownType<Previous | Changed> {
    constructor(previous: Previous | Changed, why: Type) {
        super(previous, why);
    }

    getReason(translation: Translation) {
        return translation.node.NotAStreamType.description;
    }
}
