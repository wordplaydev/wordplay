import Conflict from './Conflict';
import type Name from '../nodes/Name';
import type Translation from '../translations/Translation';
import NodeLink from '../translations/NodeLink';
import type Context from '../nodes/Context';

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
            primary: this.duplicate,
            secondary: this.name,
        };
    }

    getPrimaryExplanation(translation: Translation, context: Context) {
        return translation.conflict.DuplicateName.primary(
            new NodeLink(
                this.duplicate,
                translation,
                context,
                this.duplicate.getName()
            )
        );
    }

    getSecondaryExplanation(translation: Translation, context: Context) {
        return translation.conflict.DuplicateName.primary(
            new NodeLink(this.name, translation, context, this.name.getName())
        );
    }
}
