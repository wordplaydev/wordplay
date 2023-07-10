import type Context from '@nodes/Context';
import type Token from '@nodes/Token';
import type Type from '@nodes/Type';
import NodeRef from '@locale/NodeRef';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';
import concretize from '../locale/concretize';

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
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.node.Reference.conflict.UnknownName,
                        new NodeRef(
                            this.name,
                            locale,
                            context,
                            this.name.getText()
                        ),
                        this.type
                            ? new NodeRef(this.type, locale, context)
                            : undefined
                    ),
            },
        };
    }
}
