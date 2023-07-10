import Conflict from './Conflict';
import type Name from '@nodes/Name';
import type Locale from '@locale/Locale';
import NodeLink from '@locale/NodeRef';
import type Context from '@nodes/Context';
import concretize from '../locale/concretize';
import type Bind from '../nodes/Bind';

export default class DuplicateName extends Conflict {
    readonly bind: Bind;
    readonly duplicate: Name;

    constructor(name: Bind, duplicate: Name) {
        super(true);

        this.bind = name;
        this.duplicate = duplicate;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.bind,
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.node.Bind.conflict.DuplicateName.primary,
                        new NodeLink(
                            this.duplicate,
                            locale,
                            context,
                            this.duplicate.getName()
                        )
                    ),
            },
            secondary: {
                node: this.duplicate,
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.node.Bind.conflict.DuplicateName.secondary,
                        new NodeLink(
                            this.bind,
                            locale,
                            context,
                            this.duplicate.getName()
                        )
                    ),
            },
        };
    }
}
