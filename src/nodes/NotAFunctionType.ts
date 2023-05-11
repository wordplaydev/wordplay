import type Type from './Type';
import UnknownType from './UnknownType';
import type Convert from './Convert';
import type Evaluate from './Evaluate';
import type Locale from '@translation/Locale';

export default class NotAFunctionType extends UnknownType<Evaluate | Convert> {
    constructor(evaluate: Evaluate | Convert, why: Type | undefined) {
        super(evaluate, why);
    }

    getReason(translation: Locale) {
        return translation.node.NotAFunctionType.description;
    }
}
