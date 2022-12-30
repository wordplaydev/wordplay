import type Name from '../nodes/Name';
import type Translations from '../nodes/Translations';
import { TRANSLATE } from '../nodes/Translations';
import Conflict from './Conflict';

export default class UnnamedAlias extends Conflict {
    readonly alias: Name;
    constructor(alias: Name) {
        super(true);
        this.alias = alias;
    }

    getConflictingNodes() {
        return { primary: this.alias, secondary: [] };
    }

    getPrimaryExplanation(): Translations {
        return {
            '😀': TRANSLATE,
            eng: `Don't forget to name me!`,
        };
    }
}
