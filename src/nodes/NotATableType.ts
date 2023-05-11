import type Type from './Type';
import UnknownType from './UnknownType';
import type Select from './Select';
import type Locale from '@translation/Locale';

export default class NotATableType extends UnknownType<Select> {
    constructor(query: Select, why: Type) {
        super(query, why);
    }

    getReason(translation: Locale) {
        return translation.node.NotATableType.description;
    }
}
