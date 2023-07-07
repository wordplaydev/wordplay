import type Name from '@nodes/Name';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';
import concretize from '../locale/locales/concretize';

export default class Unnamed extends Conflict {
    readonly alias: Name;
    constructor(alias: Name) {
        super(true);
        this.alias = alias;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.alias,
                explanation: (locale: Locale) =>
                    concretize(locale, locale.conflict.Unnamed),
            },
        };
    }
}
