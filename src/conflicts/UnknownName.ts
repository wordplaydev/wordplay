import type Context from '@nodes/Context';
import Token from '@nodes/Token';
import type Type from '@nodes/Type';
import NodeRef from '@locale/NodeRef';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';
import concretize from '../locale/concretize';
import type NameType from '../nodes/NameType';
import type Reference from '../nodes/Reference';

export class UnknownName extends Conflict {
    readonly name: Reference | NameType | Token;
    readonly type: Type | undefined;

    constructor(name: Reference | NameType | Token, type: Type | undefined) {
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
                        this.name instanceof Token
                            ? undefined
                            : new NodeRef(this.name, locale, context),
                        this.type
                            ? new NodeRef(this.type, locale, context)
                            : undefined
                    ),
            },
        };
    }
}
