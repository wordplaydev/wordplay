import type Context from '../nodes/Context';
import type Token from '../nodes/Token';
import type Type from '../nodes/Type';
import NodeLink from '../translation/NodeLink';
import type Translation from '../translation/Translation';
import Conflict from './Conflict';

export class UnknownName extends Conflict {
    readonly name: Token;
    readonly type: Type | undefined;

    constructor(name: Token, type: Type | undefined) {
        super(false);
        this.name = name;
        this.type = type;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.name,
                explanation: (translation: Translation, context: Context) =>
                    translation.conflict.UnknownName.primary(
                        new NodeLink(
                            this.name,
                            translation,
                            context,
                            this.name.getText()
                        ),
                        this.type
                            ? new NodeLink(this.type, translation, context)
                            : undefined
                    ),
            },
        };
    }
}
