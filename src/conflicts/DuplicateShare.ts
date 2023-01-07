import type Bind from '../nodes/Bind';
import type Context from '../nodes/Context';
import NodeLink from '../translations/NodeLink';
import type Translation from '../translations/Translation';
import Conflict from './Conflict';

export class DuplicateShare extends Conflict {
    readonly share: Bind;
    readonly other: Bind;
    constructor(share: Bind, other: Bind) {
        super(false);
        this.share = share;
        this.other = other;
    }

    getConflictingNodes() {
        return { primary: this.share.names, secondary: [this.other.names] };
    }

    getPrimaryExplanation(translation: Translation, context: Context) {
        return translation.conflict.DuplicateShare.primary(
            new NodeLink(this.other, translation, context)
        );
    }

    getSecondaryExplanation(translation: Translation, context: Context) {
        return translation.conflict.DuplicateShare.secondary(
            new NodeLink(this.other, translation, context)
        );
    }
}
