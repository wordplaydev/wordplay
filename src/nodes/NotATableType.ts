import type Type from './Type';
import UnknownType from './UnknownType';
import type Select from './Select';
import type Translation from '../translations/Translation';

export default class NotATableType extends UnknownType<Select> {
    constructor(query: Select, why: Type) {
        super(query, why);
    }

    getReason(translation: Translation) {
        return translation.nodes.NotATableType.description;
    }
}
