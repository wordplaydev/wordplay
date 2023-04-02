import type Type from './Type';
import UnknownType from './UnknownType';
import type Convert from './Convert';
import type Evaluate from './Evaluate';
import type Translation from '@translation/Translation';

export default class NotAFunctionType extends UnknownType<Evaluate | Convert> {
    constructor(evaluate: Evaluate | Convert, why: Type | undefined) {
        super(evaluate, why);
    }

    getReason(translation: Translation) {
        return translation.node.NotAFunctionType.description;
    }
}
