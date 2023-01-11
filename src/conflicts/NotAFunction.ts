import type BinaryOperation from '../nodes/BinaryOperation';
import Evaluate from '../nodes/Evaluate';
import Conflict from './Conflict';
import type UnaryOperation from '../nodes/UnaryOperation';
import type Token from '../nodes/Token';
import type Type from '../nodes/Type';
import type Translation from '../translation/Translation';
import type Context from '../nodes/Context';
import NodeLink from '../translation/NodeLink';
import Reference from '../nodes/Reference';

export default class NotAFunction extends Conflict {
    readonly evaluate: Evaluate | BinaryOperation | UnaryOperation;
    readonly type: Type | undefined;
    readonly name: Reference | Token | undefined;

    constructor(
        evaluate: Evaluate | BinaryOperation | UnaryOperation,
        name: Reference | Token | undefined,
        type: Type | undefined
    ) {
        super(false);

        this.evaluate = evaluate;
        this.name = name;
        this.type = type;
    }

    getConflictingNodes() {
        return {
            primary: {
                node:
                    this.evaluate instanceof Evaluate
                        ? this.evaluate.func
                        : this.evaluate.operator,
                explanation: (translation: Translation, context: Context) =>
                    translation.conflict.NotAFunction.primary(
                        this.name
                            ? new NodeLink(
                                  this.name,
                                  translation,
                                  context,
                                  this.name instanceof Reference
                                      ? this.name.getName()
                                      : this.name.getText()
                              )
                            : undefined,
                        this.type
                            ? new NodeLink(this.type, translation, context)
                            : undefined
                    ),
            },
        };
    }
}
