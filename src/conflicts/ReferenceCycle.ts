import type Context from '../nodes/Context';
import type Reference from '../nodes/Reference';
import NodeLink from '../translations/NodeLink';
import type Translation from '../translations/Translation';
import Conflict from './Conflict';

export default class ReferenceCycle extends Conflict {
    readonly name: Reference;

    constructor(name: Reference) {
        super(true);

        this.name = name;
    }

    getConflictingNodes() {
        return { primary: this.name };
    }

    getPrimaryExplanation(translation: Translation, context: Context) {
        return translation.conflict.ReferenceCycle.primary(
            new NodeLink(this.name, translation, context, this.name.getName())
        );
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
