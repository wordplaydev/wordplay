import type Context from '@nodes/Context';
import type Reference from '@nodes/Reference';
import NodeLink from '@locale/NodeLink';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';
import concretize from '../locale/locales/concretize';

export default class ReferenceCycle extends Conflict {
    readonly name: Reference;

    constructor(name: Reference) {
        super(true);

        this.name = name;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.name,
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.conflict.ReferenceCycle,
                        new NodeLink(
                            this.name,
                            locale,
                            context,
                            this.name.getName()
                        )
                    ),
            },
        };
    }
}
