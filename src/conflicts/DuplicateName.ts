import Conflict from './Conflict';
import type Name from '@nodes/Name';
import type Translation from '@translation/Translation';
import NodeLink from '@translation/NodeLink';
import type Context from '@nodes/Context';

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
                explanation: (translation: Translation, context: Context) =>
                    translation.conflict.DuplicateName.primary(
                        new NodeLink(
                            this.duplicate,
                            translation,
                            context,
                            this.duplicate.getName()
                        )
                    ),
            },
            secondary: {
                node: this.name,
                explanation: (translation: Translation, context: Context) =>
                    translation.conflict.DuplicateName.primary(
                        new NodeLink(
                            this.name,
                            translation,
                            context,
                            this.name.getName()
                        )
                    ),
            },
        };
    }
}
