import Conflict from './Conflict';
import type Name from '@nodes/Name';
import type Locale from '@locale/Locale';
import NodeLink from '@locale/NodeLink';
import type Context from '@nodes/Context';
import concretize from '../locale/locales/concretize';

export default class DuplicateName extends Conflict {
    readonly name: Name;
    readonly duplicate: Name;

    constructor(name: Name, duplicate: Name) {
        super(true);

        this.name = name;
        this.duplicate = duplicate;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.duplicate,
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.conflict.DuplicateName.primary,
                        new NodeLink(
                            this.duplicate,
                            locale,
                            context,
                            this.duplicate.getName()
                        )
                    ),
            },
            secondary: {
                node: this.name,
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.conflict.DuplicateName.secondary,
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
